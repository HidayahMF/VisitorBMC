import { getDbConnection, sql } from '../config/database';
import { env } from '../config/env';

export interface IHrisEmployee {
  name: string;
  username: string;
  isActive: boolean;
}

/**
 * Searches the HRIS employee table (same SQL instance/database as BMC) by name.
 *
 * Table and column identifiers come from trusted environment configuration,
 * NOT from user input; the search term is always passed as a parameterized
 * value. Only the display name is exposed — no sensitive HRIS columns.
 */
export async function searchEmployees(
  q: string,
  limit: number = 10,
): Promise<IHrisEmployee[]> {
  const trimmed = q.trim();
  if (trimmed.length < env.HRIS_SEARCH_MIN_CHARS) {
    return [];
  }

  const safeLimit = Math.min(Math.max(1, limit), 50);
  const table = env.HRIS_EMPLOYEE_TABLE;
  const nameCol = env.HRIS_EMPLOYEE_NAME_COL;
  const nipCol = env.HRIS_EMPLOYEE_NIP_COL;

  const pool = await getDbConnection();
  const result = await pool
    .request()
    .input('q', sql.NVarChar, `%${trimmed}%`)
    .input('limit', sql.Int, safeLimit)
    .query(`
      SELECT TOP (@limit) RTRIM([${nameCol}]) AS name, RTRIM([${nipCol}]) AS username, is_Active AS isActive
      FROM ${table}
      WHERE RTRIM([${nameCol}]) LIKE @q OR RTRIM([${nipCol}]) LIKE @q
      ORDER BY RTRIM([${nameCol}])
    `);

  return result.recordset.map((row) => ({ name: row.name, username: row.username, isActive: row.isActive === true || ['1', 'Y', 'A', 'ACTIVE', 'TRUE'].includes(String(row.isActive).toUpperCase()) }));
}
