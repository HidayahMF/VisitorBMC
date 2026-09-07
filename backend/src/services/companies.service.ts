import { getDbConnection, sql } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export interface ICompany {
  Id: number;
  CompanyName: string;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date | null;
}

export interface IPaginatedCompanies {
  data: ICompany[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const MAX_PAGE_SIZE = 100;

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCompany(row: any): ICompany {
  return {
    Id: row.Id,
    CompanyName: row.CompanyName,
    IsActive: !!row.IsActive,
    CreatedAt: row.CreatedAt,
    UpdatedAt: row.UpdatedAt,
  };
}

export async function listCompanies(params: {
  q?: string;
  active?: boolean;
  page?: number;
  limit?: number;
}): Promise<IPaginatedCompanies> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, params.limit ?? 20));
  const offset = (page - 1) * limit;

  const pool = await getDbConnection();

  let whereClause = '';
  const conditions: string[] = [];

  if (params.q) {
    conditions.push('c.CompanyName LIKE @q');
  }

  if (params.active !== undefined) {
    conditions.push('c.IsActive = @active');
  }

  if (conditions.length > 0) {
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }

  const countResult = await pool
    .request()
    .input('q', sql.NVarChar, params.q ? `%${params.q}%` : '%')
    .input('active', sql.Bit, params.active !== undefined ? (params.active ? 1 : 0) : null)
    .query<{ total: number }>(`
       SELECT COUNT(*) AS total FROM vms.Companies c ${whereClause}`);
  const total = countResult.recordset[0].total;

  const dataResult = await pool
    .request()
    .input('q', sql.NVarChar, params.q ? `%${params.q}%` : '%')
    .input('active', sql.Bit, params.active !== undefined ? (params.active ? 1 : 0) : null)
    .input('limit', sql.Int, limit)
    .input('offset', sql.Int, offset)
    .query(`
       SELECT c.Id, c.CompanyName, c.IsActive, c.CreatedAt, c.UpdatedAt
       FROM vms.Companies c ${whereClause}
       ORDER BY c.Id
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY`);

  return {
    data: dataResult.recordset.map(toCompany),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCompanyById(id: number): Promise<ICompany | null> {
  const pool = await getDbConnection();
  const result = await pool
    .request()
    .input('id', sql.Int, id)
    .query('SELECT c.Id, c.CompanyName, c.IsActive, c.CreatedAt, c.UpdatedAt FROM vms.Companies c WHERE c.Id = @id');

  const row = result.recordset[0];
  if (!row) return null;
  return toCompany(row);
}

export async function createCompany(name: string): Promise<ICompany> {
  const normalized = normalizeName(name);

  if (!normalized) {
    throw new AppError('Company name cannot be empty', 400);
  }

  const pool = await getDbConnection();

  const existsResult = await pool
    .request()
    .input('normalizedName', sql.NVarChar, normalized)
    .query(`
      SELECT Id FROM vms.Companies
      WHERE LOWER(LTRIM(RTRIM(CompanyName))) = LOWER(@normalizedName)
    `);

  if (existsResult.recordset.length > 0) {
    throw new AppError('Company already exists', 409);
  }

  const result = await pool
    .request()
    .input('companyName', sql.NVarChar(100), normalized)
    .query(`
      INSERT INTO vms.Companies (CompanyName)
      OUTPUT INSERTED.Id, INSERTED.CompanyName, INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
      VALUES (@companyName)
    `);

  return toCompany(result.recordset[0]);
}

export async function updateCompany(
  id: number,
  name: string,
): Promise<ICompany | null> {
  const normalized = normalizeName(name);

  if (!normalized) {
    throw new AppError('Company name cannot be empty', 400);
  }

  const pool = await getDbConnection();

  const existsResult = await pool
    .request()
    .input('normalizedName', sql.NVarChar, normalized)
    .input('id', sql.Int, id)
    .query(`
      SELECT Id FROM vms.Companies
      WHERE LOWER(LTRIM(RTRIM(CompanyName))) = LOWER(@normalizedName)
      AND Id <> @id
    `);

  if (existsResult.recordset.length > 0) {
    throw new AppError('Company already exists', 409);
  }

  const result = await pool
    .request()
    .input('id', sql.Int, id)
    .input('companyName', sql.NVarChar(100), normalized)
    .query(`
      UPDATE vms.Companies
      SET CompanyName = @companyName, UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id, INSERTED.CompanyName, INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
      WHERE Id = @id
    `);

  const row = result.recordset[0];
  if (!row) return null;
  return toCompany(row);
}

export async function updateCompanyStatus(
  id: number,
  isActive: boolean,
): Promise<ICompany | null> {
  const pool = await getDbConnection();

  const result = await pool
    .request()
    .input('id', sql.Int, id)
    .input('isActive', sql.Bit, isActive ? 1 : 0)
    .query(`
      UPDATE vms.Companies
      SET IsActive = @isActive, UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id, INSERTED.CompanyName, INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
      WHERE Id = @id
    `);

  const row = result.recordset[0];
  if (!row) return null;
  return toCompany(row);
}

export async function deleteCompany(id: number): Promise<boolean> {
  const pool = await getDbConnection();
  const transaction = new sql.Transaction(pool);
  let started = false;

  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    started = true;

    const exists = await transaction.request()
      .input('id', sql.Int, id)
      .query('SELECT Id FROM vms.Companies WITH (UPDLOCK, HOLDLOCK) WHERE Id = @id');
    if (exists.recordset.length === 0) {
      await transaction.rollback();
      return false;
    }

    await transaction.request().input('companyId', sql.Int, id).query(`
      DELETE FROM vms.VisitorInductionRecords
      WHERE VisitId IN (SELECT Id FROM vms.Visits WHERE CompanyId = @companyId)
         OR VisitorId IN (SELECT Id FROM vms.Visitors WHERE CompanyId = @companyId)
    `);
    await transaction.request().input('companyId', sql.Int, id).query(`
      DELETE FROM vms.AuditLogs
      WHERE (EntityType = 'Visit' AND EntityId IN (SELECT Id FROM vms.Visits WHERE CompanyId = @companyId))
         OR (EntityType = 'Visitor' AND EntityId IN (SELECT Id FROM vms.Visitors WHERE CompanyId = @companyId))
    `);
    await transaction.request().input('companyId', sql.Int, id).query(`
      DELETE FROM vms.VisitVisitors
      WHERE VisitId IN (SELECT Id FROM vms.Visits WHERE CompanyId = @companyId)
         OR VisitorId IN (SELECT Id FROM vms.Visitors WHERE CompanyId = @companyId)
    `);
    await transaction.request().input('companyId', sql.Int, id).query('DELETE FROM vms.Visits WHERE CompanyId = @companyId');
    await transaction.request().input('companyId', sql.Int, id).query('DELETE FROM vms.Visitors WHERE CompanyId = @companyId');
    await transaction.request().input('id', sql.Int, id).query('DELETE FROM vms.Companies WHERE Id = @id');

    await transaction.commit();
    started = false;
    return true;
  } catch (error) {
    if (started) await transaction.rollback();
    throw error;
  }
}

export async function findCompaniesBySearch(
  query: string,
  limit: number = 20,
): Promise<ICompany[]> {
  if (!query.trim()) return [];

  const pool = await getDbConnection();
  const result = await pool
    .request()
    .input('q', sql.NVarChar, `%${query}%`)
    .input('limit', sql.Int, Math.min(MAX_PAGE_SIZE, Math.max(1, limit)))
    .query(`
       SELECT TOP (@limit) c.Id, c.CompanyName, c.IsActive, c.CreatedAt, c.UpdatedAt
       FROM vms.Companies c
       WHERE c.CompanyName LIKE @q
       ORDER BY c.CompanyName
    `);

  return result.recordset.map(toCompany);
}
