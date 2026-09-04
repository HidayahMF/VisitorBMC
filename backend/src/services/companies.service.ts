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
    conditions.push('CompanyName LIKE @q');
  }

  if (params.active !== undefined) {
    conditions.push('IsActive = @active');
  }

  if (conditions.length > 0) {
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }

  const countResult = await pool
    .request()
    .input('q', sql.NVarChar, params.q ? `%${params.q}%` : '%')
    .input('active', sql.Bit, params.active !== undefined ? (params.active ? 1 : 0) : null)
    .query<{ total: number }>(`
      SELECT COUNT(*) AS total FROM Companies ${whereClause}`);
  const total = countResult.recordset[0].total;

  const dataResult = await pool
    .request()
    .input('q', sql.NVarChar, params.q ? `%${params.q}%` : '%')
    .input('active', sql.Bit, params.active !== undefined ? (params.active ? 1 : 0) : null)
    .input('limit', sql.Int, limit)
    .input('offset', sql.Int, offset)
    .query(`
      SELECT Id, CompanyName, IsActive, CreatedAt, UpdatedAt
      FROM Companies ${whereClause}
      ORDER BY Id
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
    .query('SELECT Id, CompanyName, IsActive, CreatedAt, UpdatedAt FROM Companies WHERE Id = @id');

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
      SELECT Id FROM Companies
      WHERE LOWER(LTRIM(RTRIM(CompanyName))) = LOWER(@normalizedName)
    `);

  if (existsResult.recordset.length > 0) {
    throw new AppError('Company already exists', 409);
  }

  const result = await pool
    .request()
    .input('companyName', sql.NVarChar(100), normalized)
    .query(`
      INSERT INTO Companies (CompanyName)
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
      SELECT Id FROM Companies
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
      UPDATE Companies
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
      UPDATE Companies
      SET IsActive = @isActive, UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id, INSERTED.CompanyName, INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
      WHERE Id = @id
    `);

  const row = result.recordset[0];
  if (!row) return null;
  return toCompany(row);
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
      SELECT TOP (@limit) Id, CompanyName, IsActive, CreatedAt, UpdatedAt
      FROM Companies
      WHERE CompanyName LIKE @q
      ORDER BY CompanyName
    `);

  return result.recordset.map(toCompany);
}
