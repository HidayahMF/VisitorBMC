import sql, { type config as SqlConfig } from 'mssql';
import { env } from './env';

const dbConfig: SqlConfig = {
  server: env.DB.SERVER,
  port: env.DB.PORT,
  database: env.DB.DATABASE,
  user: env.DB.USER,
  password: env.DB.PASSWORD,
  options: {
    encrypt: env.DB.ENCRYPT,
    trustServerCertificate: env.DB.TRUST_SERVER_CERTIFICATE,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getDbConnection(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await new sql.ConnectionPool(dbConfig).connect();
  }
  return pool;
}

export async function closeDbConnection(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

export async function testDbConnection(): Promise<boolean> {
  try {
    const connection = await getDbConnection();
    const result = await connection.request().query('SELECT 1 AS Result;');
    return result.recordset.length > 0;
  } catch {
    return false;
  }
}

export { sql, dbConfig };
