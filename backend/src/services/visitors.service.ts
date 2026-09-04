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
  VisitorCode: string;
  VisitorName: string;
  PhoneNumber: string | null;
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
    .query('SELECT Id FROM Companies WHERE Id = @id AND IsActive = 1');

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
    conditions.push('(VisitorName LIKE @q OR VisitorCode LIKE @q OR PhoneNumber LIKE @q)');
  }
  if (params.companyId !== undefined) {
    conditions.push('CompanyId = @companyId');
  }
  if (params.active !== undefined) {
    conditions.push('IsActive = @active');
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
    FROM Visitors v
    INNER JOIN Companies c ON v.CompanyId = c.Id
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
    FROM Visitors v
    INNER JOIN Companies c ON v.CompanyId = c.Id
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
      FROM Visitors v
      INNER JOIN Companies c ON v.CompanyId = c.Id
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
        FROM Visitors
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
      FROM Visitors
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
    .query(`
      INSERT INTO Visitors (VisitorCode, VisitorName, CompanyId, PhoneNumber)
      OUTPUT INSERTED.Id, INSERTED.VisitorCode, INSERTED.VisitorName, INSERTED.CompanyId, 
             INSERTED.PhoneNumber, INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
      VALUES ('VST-TMP', @visitorName, @companyId, @phoneNumber)
    `);

  const newId = result.recordset[0].Id;
  const visitorCode = `VST-${String(newId).padStart(6, '0')}`;

  await pool
    .request()
    .input('id', sql.Int, newId)
    .input('visitorCode', sql.VarChar(20), visitorCode)
    .query('UPDATE Visitors SET VisitorCode = @visitorCode WHERE Id = @id');

  const finalResult = await pool
    .request()
    .input('id', sql.Int, newId)
    .query(`
      SELECT Id, VisitorCode, VisitorName, CompanyId, PhoneNumber, IsActive, CreatedAt, UpdatedAt
      FROM Visitors WHERE Id = @id
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
        .query<{ CompanyId: number }>('SELECT CompanyId FROM Visitors WHERE Id = @id');
      targetCompanyId = currentVisitor.recordset[0]?.CompanyId;
    }

    if (targetCompanyId) {
      const dupCheck = await pool
        .request()
        .input('normalizedName', sql.NVarChar, normalized.toLowerCase())
        .input('id', sql.Int, id)
        .input('companyId', sql.Int, targetCompanyId)
        .query(`
          SELECT Id FROM Visitors
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
    UPDATE Visitors
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
      UPDATE Visitors
      SET IsActive = @isActive, UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id, INSERTED.VisitorCode, INSERTED.VisitorName, INSERTED.CompanyId,
             INSERTED.PhoneNumber, INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
      WHERE Id = @id
    `);

  const row = result.recordset[0];
  if (!row) return null;
  return toVisitor(row);
}

export async function searchVisitors(query: string, limit: number = 20): Promise<IPotentialMatch[]> {
  if (!query.trim()) return [];

  const pool = await getDbConnection();
  const result = await pool
    .request()
    .input('q', sql.NVarChar, `%${query}%`)
    .input('limit', sql.Int, Math.min(MAX_PAGE_SIZE, Math.max(1, limit)))
    .query(`
      SELECT TOP (@limit) Id, VisitorCode, VisitorName, PhoneNumber
      FROM Visitors
      WHERE VisitorName LIKE @q OR VisitorCode LIKE @q
      ORDER BY VisitorName
    `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.recordset.map((row: any) => ({
    Id: row.Id,
    VisitorCode: row.VisitorCode,
    VisitorName: row.VisitorName,
    PhoneNumber: row.PhoneNumber || null,
  }));
}
