import { getDbConnection, sql } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export interface IVisitor {
  Id: number;
  VisitorCode: string;
  VisitorName: string;
  CompanyId: number;
  PhoneNumber: string | null;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date | null;
}

export interface IVisitorDetail extends Omit<IVisitor, 'CompanyId'> {
  Company: {
    Id: number;
    CompanyName: string;
  };
}

export interface IPaginatedVisitors {
  data: IVisitorDetail[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IPotentialMatch {
  Id: number;
  CompanyId?: number;
  VisitorCode: string;
  VisitorName: string;
  PhoneNumber: string | null;
}

export interface IVisitorVisitHistoryEntry {
  VisitId: number;
  VisitCode: string;
  CompanyName: string;
  HostName: string;
  Purpose: string;
  VisitDate: Date;
  CheckInTime: Date | null;
  CheckOutTime: Date | null;
  Status: string;
}

const MAX_PAGE_SIZE = 100;

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function normalizePhone(phone: string): string {
  return phone.trim().replace(/[\s-]/g, '');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toVisitor(row: any): IVisitor {
  return {
    Id: row.Id,
    VisitorCode: row.VisitorCode,
    VisitorName: row.VisitorName,
    CompanyId: row.CompanyId,
    PhoneNumber: row.PhoneNumber || null,
    IsActive: !!row.IsActive,
    CreatedAt: row.CreatedAt,
    UpdatedAt: row.UpdatedAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toVisitorDetail(row: any): IVisitorDetail {
  return {
    Id: row.Id,
    VisitorCode: row.VisitorCode,
    VisitorName: row.VisitorName,
    PhoneNumber: row.PhoneNumber || null,
    IsActive: !!row.IsActive,
    CreatedAt: row.CreatedAt,
    UpdatedAt: row.UpdatedAt,
    Company: {
      Id: row.CompanyId,
      CompanyName: row.CompanyName,
    },
  };
}

async function validateCompany(pool: sql.ConnectionPool, companyId: number): Promise<void> {
  const result = await pool
    .request()
    .input('id', sql.Int, companyId)
    .query('SELECT c.Id FROM vms.Companies c WHERE c.Id = @id AND c.IsActive = 1');

  if (result.recordset.length === 0) {
    throw new AppError('Company not found or inactive', 404);
  }
}

export async function listVisitors(params: {
  q?: string;
  companyId?: number;
  active?: boolean;
  page?: number;
  limit?: number;
}): Promise<IPaginatedVisitors> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, params.limit ?? 20));
  const offset = (page - 1) * limit;

  const pool = await getDbConnection();

  let whereClause = '';
  const conditions: string[] = [];

  if (params.q) {
    conditions.push('(v.VisitorName LIKE @q OR v.VisitorCode LIKE @q OR v.PhoneNumber LIKE @q)');
  }
  if (params.companyId !== undefined) {
    conditions.push('v.CompanyId = @companyId');
  }
  if (params.active !== undefined) {
    conditions.push('v.IsActive = @active');
  }

  if (conditions.length > 0) {
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }

  const req = pool.request();
  if (params.q) req.input('q', sql.NVarChar, `%${params.q}%`);
  if (params.companyId !== undefined) req.input('companyId', sql.Int, params.companyId);
  if (params.active !== undefined) req.input('active', sql.Bit, params.active ? 1 : 0);
  req.input('limit', sql.Int, limit);
  req.input('offset', sql.Int, offset);

  const countReq = pool.request();
  if (params.q) countReq.input('q', sql.NVarChar, `%${params.q}%`);
  if (params.companyId !== undefined) countReq.input('companyId', sql.Int, params.companyId);
  if (params.active !== undefined) countReq.input('active', sql.Bit, params.active ? 1 : 0);

  const countResult = await countReq.query<{ total: number }>(`
    SELECT COUNT(*) AS total
    FROM vms.Visitors v
    INNER JOIN vms.Companies c ON v.CompanyId = c.Id
    ${whereClause}
  `);
  const total = countResult.recordset[0].total;

  const req2 = pool.request();
  if (params.q) req2.input('q', sql.NVarChar, `%${params.q}%`);
  if (params.companyId !== undefined) req2.input('companyId', sql.Int, params.companyId);
  if (params.active !== undefined) req2.input('active', sql.Bit, params.active ? 1 : 0);
  req2.input('limit', sql.Int, limit);
  req2.input('offset', sql.Int, offset);

  const dataResult = await req2.query(`
    SELECT v.Id, v.VisitorCode, v.VisitorName, v.PhoneNumber, v.IsActive, v.CreatedAt, v.UpdatedAt,
           v.CompanyId, c.CompanyName
    FROM vms.Visitors v
    INNER JOIN vms.Companies c ON v.CompanyId = c.Id
    ${whereClause}
    ORDER BY v.Id
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY
  `);

  return {
    data: dataResult.recordset.map(toVisitorDetail),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getVisitorById(id: number): Promise<IVisitorDetail | null> {
  const pool = await getDbConnection();
  const result = await pool
    .request()
    .input('id', sql.Int, id)
    .query(`
      SELECT v.Id, v.VisitorCode, v.VisitorName, v.PhoneNumber, v.IsActive, v.CreatedAt, v.UpdatedAt,
             v.CompanyId, c.CompanyName
      FROM vms.Visitors v
      INNER JOIN vms.Companies c ON v.CompanyId = c.Id
      WHERE v.Id = @id
    `);

  const row = result.recordset[0];
  if (!row) return null;
  return toVisitorDetail(row);
}

export async function createVisitor(params: {
  visitorName: string;
  companyId: number;
  phoneNumber?: string;
}): Promise<{ visitor: IVisitor; potentialMatches?: IPotentialMatch[] }> {
  const visitorName = normalizeName(params.visitorName);
  const phoneNumber = params.phoneNumber ? normalizePhone(params.phoneNumber) : null;

  if (!visitorName) {
    throw new AppError('Visitor name is required', 400);
  }

  const pool = await getDbConnection();
  await validateCompany(pool, params.companyId);

  const normalizedNameLower = visitorName.toLowerCase();
  const normalizedPhoneLower = phoneNumber ? phoneNumber.toLowerCase() : null;

  if (normalizedPhoneLower) {
    const strongDup = await pool
      .request()
      .input('companyId', sql.Int, params.companyId)
      .input('name', sql.NVarChar, normalizedNameLower)
      .input('phone', sql.NVarChar, normalizedPhoneLower)
      .query(`
        SELECT Id, VisitorCode, VisitorName, PhoneNumber
        FROM vms.Visitors
        WHERE CompanyId = @companyId
          AND LOWER(LTRIM(RTRIM(VisitorName))) = @name
          AND LOWER(LTRIM(RTRIM(PhoneNumber))) = @phone
      `);

    if (strongDup.recordset.length > 0) {
      throw new AppError('Visitor already exists', 409);
    }
  }

  const potentialMatches = await pool
    .request()
    .input('companyId', sql.Int, params.companyId)
    .input('name', sql.NVarChar, normalizedNameLower)
    .query(`
      SELECT Id, VisitorCode, VisitorName, PhoneNumber
      FROM vms.Visitors
      WHERE CompanyId = @companyId
        AND LOWER(LTRIM(RTRIM(VisitorName))) = @name
      ORDER BY CreatedAt DESC
    `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const potential: IPotentialMatch[] = potentialMatches.recordset.map((row: any) => ({
    Id: row.Id,
    VisitorCode: row.VisitorCode,
    VisitorName: row.VisitorName,
    PhoneNumber: row.PhoneNumber || null,
  }));

  const isStrongMatch = potential.some(
    (m) => phoneNumber && m.PhoneNumber && normalizePhone(m.PhoneNumber).toLowerCase() === phoneNumber.toLowerCase(),
  );

  if (isStrongMatch) {
    throw new AppError('Visitor already exists', 409);
  }

  const result = await pool
    .request()
    .input('visitorName', sql.NVarChar(100), visitorName)
    .input('companyId', sql.Int, params.companyId)
    .input('phoneNumber', sql.VarChar(20), phoneNumber)
    .input('temporaryCode', sql.VarChar(20), `VST-TMP-${Date.now().toString().slice(-11)}`)
    .query(`
      INSERT INTO vms.Visitors (VisitorCode, VisitorName, CompanyId, PhoneNumber)
      OUTPUT INSERTED.Id, INSERTED.VisitorCode, INSERTED.VisitorName, INSERTED.CompanyId, 
               INSERTED.PhoneNumber, INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
      VALUES (@temporaryCode, @visitorName, @companyId, @phoneNumber)
    `);

  const newId = result.recordset[0].Id;

  await pool.request()
    .input('id', sql.Int, newId)
    .query(`
      ;WITH Numbers AS (
        SELECT TOP (100000) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS Number
        FROM sys.all_objects a
        CROSS JOIN sys.all_objects b
      )
      UPDATE visitor
      SET VisitorCode = 'VST-' + RIGHT('000000' + CAST((
        SELECT MIN(numbers.Number)
        FROM Numbers numbers
        WHERE NOT EXISTS (
          SELECT 1
          FROM vms.Visitors existing
          WHERE existing.VisitorCode = 'VST-' + RIGHT('000000' + CAST(numbers.Number AS VARCHAR(6)), 6)
        )
      ) AS VARCHAR(6)), 6)
      FROM vms.Visitors visitor
      WHERE visitor.Id = @id
    `);

  const finalResult = await pool
    .request()
    .input('id', sql.Int, newId)
    .query(`
       SELECT v.Id, v.VisitorCode, v.VisitorName, v.CompanyId, v.PhoneNumber, v.IsActive, v.CreatedAt, v.UpdatedAt
       FROM vms.Visitors v WHERE v.Id = @id
    `);

  return {
    visitor: toVisitor(finalResult.recordset[0]),
    potentialMatches: potential.length > 0 ? potential : undefined,
  };
}

export async function updateVisitor(
  id: number,
  params: {
    visitorName?: string;
    companyId?: number;
    phoneNumber?: string;
  },
): Promise<IVisitor | null> {
  const updates: string[] = [];
  const pool = await getDbConnection();
  const request = pool.request();
  request.input('id', sql.Int, id);

  if (params.visitorName !== undefined) {
    const normalized = normalizeName(params.visitorName);
    if (!normalized) {
      throw new AppError('Visitor name cannot be empty', 400);
    }
    request.input('visitorName', sql.NVarChar(100), normalized);
    updates.push('VisitorName = @visitorName');

    let targetCompanyId = params.companyId;
    if (targetCompanyId === undefined) {
      const currentVisitor = await pool
        .request()
        .input('id', sql.Int, id)
        .query<{ CompanyId: number }>('SELECT CompanyId FROM vms.Visitors WHERE Id = @id');
      targetCompanyId = currentVisitor.recordset[0]?.CompanyId;
    }

    if (targetCompanyId) {
      const dupCheck = await pool
        .request()
        .input('normalizedName', sql.NVarChar, normalized.toLowerCase())
        .input('id', sql.Int, id)
        .input('companyId', sql.Int, targetCompanyId)
        .query(`
          SELECT Id FROM vms.Visitors
          WHERE LOWER(LTRIM(RTRIM(VisitorName))) = @normalizedName
          AND CompanyId = @companyId
          AND Id <> @id
        `);
      if (dupCheck.recordset.length > 0) {
        throw new AppError('Visitor with this name already exists in this company', 409);
      }
    }
  }

  if (params.companyId !== undefined) {
    await validateCompany(pool, params.companyId);
    request.input('companyId', sql.Int, params.companyId);
    updates.push('CompanyId = @companyId');
  }

  if (params.phoneNumber !== undefined) {
    const normalized = params.phoneNumber ? normalizePhone(params.phoneNumber) : null;
    request.input('phoneNumber', sql.VarChar(20), normalized);
    updates.push('PhoneNumber = @phoneNumber');
  }

  if (updates.length === 0) {
    throw new AppError('No fields to update', 400);
  }

  updates.push('UpdatedAt = SYSUTCDATETIME()');

  const result = await request.query(`
    UPDATE vms.Visitors
    SET ${updates.join(', ')}
    OUTPUT INSERTED.Id, INSERTED.VisitorCode, INSERTED.VisitorName, INSERTED.CompanyId,
           INSERTED.PhoneNumber, INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
    WHERE Id = @id
  `);

  const row = result.recordset[0];
  if (!row) return null;
  return toVisitor(row);
}

export async function updateVisitorStatus(
  id: number,
  isActive: boolean,
): Promise<IVisitor | null> {
  const pool = await getDbConnection();
  const result = await pool
    .request()
    .input('id', sql.Int, id)
    .input('isActive', sql.Bit, isActive ? 1 : 0)
    .query(`
      UPDATE vms.Visitors
      SET IsActive = @isActive, UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id, INSERTED.VisitorCode, INSERTED.VisitorName, INSERTED.CompanyId,
             INSERTED.PhoneNumber, INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
      WHERE Id = @id
    `);

  const row = result.recordset[0];
  if (!row) return null;
  return toVisitor(row);
}

export async function deleteVisitor(id: number): Promise<boolean> {
  const pool = await getDbConnection();
  const transaction = new sql.Transaction(pool);
  let started = false;

  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    started = true;

    const exists = await transaction.request()
      .input('id', sql.Int, id)
      .query('SELECT Id FROM vms.Visitors WITH (UPDLOCK, HOLDLOCK) WHERE Id = @id');
    if (exists.recordset.length === 0) {
      await transaction.rollback();
      return false;
    }

    await transaction.request().input('id', sql.Int, id).query('DELETE FROM vms.VisitorInductionRecords WHERE VisitorId = @id');
    await transaction.request().input('id', sql.Int, id).query('DELETE FROM vms.VisitVisitors WHERE VisitorId = @id');
    await transaction.request().input('id', sql.Int, id).query("DELETE FROM vms.AuditLogs WHERE EntityType = 'Visitor' AND EntityId = @id");
    await transaction.request().input('id', sql.Int, id).query('DELETE FROM vms.Visitors WHERE Id = @id');

    await transaction.commit();
    started = false;
    return true;
  } catch (error) {
    if (started) await transaction.rollback();
    throw error;
  }
}

export async function getVisitorVisitHistory(
  visitorId: number,
): Promise<IVisitorVisitHistoryEntry[]> {
  const pool = await getDbConnection();
  const result = await pool
    .request()
    .input('visitorId', sql.Int, visitorId)
    .query(`
      SELECT v.Id AS VisitId, v.VisitCode, c.CompanyName, v.HostName, v.Purpose,
             v.VisitDate, v.CheckInTime, v.CheckOutTime, v.Status
      FROM vms.Visits v
      INNER JOIN vms.VisitVisitors vv ON v.Id = vv.VisitId
      INNER JOIN vms.Companies c ON v.CompanyId = c.Id
      WHERE vv.VisitorId = @visitorId
      ORDER BY v.VisitDate DESC, v.Id DESC
    `);

  return result.recordset.map((row) => ({
    VisitId: row.VisitId,
    VisitCode: row.VisitCode,
    CompanyName: row.CompanyName,
    HostName: row.HostName,
    Purpose: row.Purpose,
    VisitDate: row.VisitDate,
    CheckInTime: row.CheckInTime || null,
    CheckOutTime: row.CheckOutTime || null,
    Status: row.Status,
  }));
}

export async function searchVisitors(query: string, limit: number = 20): Promise<IPotentialMatch[]> {
  if (!query.trim()) return [];

  const pool = await getDbConnection();
  const result = await pool
    .request()
    .input('q', sql.NVarChar, `%${query}%`)
    .input('limit', sql.Int, Math.min(MAX_PAGE_SIZE, Math.max(1, limit)))
    .query(`
       SELECT TOP (@limit) Id, VisitorCode, VisitorName, CompanyId, PhoneNumber
      FROM vms.Visitors
      WHERE VisitorName LIKE @q OR VisitorCode LIKE @q
      ORDER BY VisitorName
    `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.recordset.map((row: any) => ({
    Id: row.Id,
    CompanyId: row.CompanyId,
    VisitorCode: row.VisitorCode,
    VisitorName: row.VisitorName,
    PhoneNumber: row.PhoneNumber || null,
  }));
}

export async function searchPublicVisitors(
  query: string,
  companyId: number,
  limit: number = 10,
): Promise<IPotentialMatch[]> {
  if (!query.trim() || !Number.isInteger(companyId)) return [];

  const pool = await getDbConnection();
  const result = await pool
    .request()
    .input('q', sql.NVarChar, `${query.trim()}%`)
    .input('companyId', sql.Int, companyId)
    .input('limit', sql.Int, Math.min(MAX_PAGE_SIZE, Math.max(1, limit)))
    .query(`
      SELECT TOP (@limit) Id, VisitorCode, VisitorName, CompanyId, PhoneNumber
      FROM vms.Visitors
      WHERE CompanyId = @companyId
        AND IsActive = 1
        AND VisitorName LIKE @q
      ORDER BY VisitorName
    `);

  return result.recordset.map((row) => ({
    Id: row.Id,
    VisitorCode: row.VisitorCode,
    VisitorName: row.VisitorName,
    CompanyId: row.CompanyId,
    PhoneNumber: row.PhoneNumber || null,
  }));
}
