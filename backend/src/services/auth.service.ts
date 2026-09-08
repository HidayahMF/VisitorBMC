import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { getDbConnection, sql } from '../config/database';
import { logAudit } from './audit-log.service';
import { AppError } from '../middleware/errorHandler';

export interface IUser {
  Id: number;
  Name: string;
  Username: string;
  Role: string;
  IsActive: boolean;
  BirthDate?: Date | string | null;
  PasswordHash?: string;
}

export interface ISafeUser {
  id: number;
  name: string;
  username: string;
  role: string;
}

export interface IManagedUser { id: number; username: string; name: string; role: string; isActive: boolean; employeeActive: boolean; }

export async function listManagedUsers(): Promise<IManagedUser[]> {
  const pool = await getDbConnection();
  const result = await pool.request().query(`
    SELECT u.Id, RTRIM(u.Username) AS Username, RTRIM(e.[${env.HRIS_EMPLOYEE_NAME_COL}]) AS Name,
           u.Role, u.IsActive AS UserIsActive, e.is_Active AS EmployeeIsActive
    FROM vms.Users u INNER JOIN ${env.HRIS_EMPLOYEE_TABLE} e
      ON RTRIM(e.[${env.HRIS_EMPLOYEE_NIP_COL}]) = RTRIM(u.Username)
    ORDER BY e.[${env.HRIS_EMPLOYEE_NAME_COL}]
  `);
  return result.recordset.map((row) => ({ id: row.Id, username: row.Username, name: row.Name, role: row.Role, isActive: !!row.UserIsActive, employeeActive: isActiveValue(row.EmployeeIsActive) }));
}

export async function addManagedUser(username: string, role: 'ADMIN' | 'SECURITY', actorId?: number, ipAddress?: string): Promise<IManagedUser> {
  const pool = await getDbConnection();
  const employee = await pool.request().input('username', sql.VarChar(50), username.trim()).query(`SELECT TOP 1 RTRIM([${env.HRIS_EMPLOYEE_NIP_COL}]) AS Username, RTRIM([${env.HRIS_EMPLOYEE_NAME_COL}]) AS Name, is_Active AS EmployeeActive FROM ${env.HRIS_EMPLOYEE_TABLE} WHERE RTRIM([${env.HRIS_EMPLOYEE_NIP_COL}])=@username`);
  const row = employee.recordset[0];
  if (!row) throw new AppError('Employee not found', 404);
  if (!isActiveValue(row.EmployeeActive)) throw new AppError('Employee is inactive in HRIS', 400);
  const existing = await pool.request().input('username', sql.VarChar(50), row.Username).query('SELECT Id, IsActive, Role FROM vms.Users WHERE Username=@username');
  if (existing.recordset[0]) throw new AppError('Employee already has VisitorBMC access', 409);
  const created = await pool.request().input('name', sql.NVarChar(100), row.Name).input('username', sql.VarChar(50), row.Username).input('role', sql.VarChar(20), role).input('passwordHash', sql.VarChar(255), '__HRIS_BIRTHDATE_LOGIN__').query('INSERT INTO vms.Users (Name, Username, PasswordHash, Role, IsActive) OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.Name, INSERTED.Role, INSERTED.IsActive VALUES (@name,@username,@passwordHash,@role,1)');
  const user = created.recordset[0];
  if (actorId) await logAudit(pool, { userId: actorId, action: 'USER_ACCESS_GRANTED' as never, entityType: 'User', entityId: user.Id, details: JSON.stringify({ role, username: user.Username }), ipAddress: ipAddress ?? null });
  return { id: user.Id, username: user.Username, name: user.Name, role: user.Role, isActive: !!user.IsActive, employeeActive: true };
}

export async function updateManagedUser(id: number, changes: { role?: 'ADMIN' | 'SECURITY'; isActive?: boolean }, actorId: number, ipAddress?: string): Promise<IManagedUser | null> {
  if (id === actorId && changes.isActive === false) throw new AppError('You cannot deactivate your own account', 400);
  const pool = await getDbConnection(); const current = await pool.request().input('id', sql.Int, id).query('SELECT Id, Role, IsActive FROM vms.Users WHERE Id=@id');
  if (!current.recordset[0]) return null;
  if (changes.isActive === false && current.recordset[0].Role === 'ADMIN') { const count = await pool.request().query("SELECT COUNT(*) AS total FROM vms.Users WHERE Role='ADMIN' AND IsActive=1"); if (count.recordset[0].total <= 1) throw new AppError('At least one active administrator must remain', 400); }
  const role = changes.role ?? current.recordset[0].Role; const active = changes.isActive ?? !!current.recordset[0].IsActive;
  await pool.request().input('id', sql.Int, id).input('role', sql.VarChar(20), role).input('active', sql.Bit, active ? 1 : 0).query('UPDATE vms.Users SET Role=@role, IsActive=@active, UpdatedAt=SYSUTCDATETIME() WHERE Id=@id');
  await logAudit(pool, { userId: actorId, action: changes.role ? 'USER_ROLE_UPDATED' as never : 'USER_ACCESS_UPDATED' as never, entityType: 'User', entityId: id, details: JSON.stringify({ role, isActive: active }), ipAddress: ipAddress ?? null });
  return (await listManagedUsers()).find((user) => user.id === id) ?? null;
}

export interface IJwtPayload {
  userId: number;
  role: string;
}

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(
  password: string,
  storedValue: string | Date | null | undefined,
): Promise<boolean> {
  if (!storedValue) return false;

  if (storedValue instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(String(storedValue))) {
    const expected = formatBirthdateToPassword(storedValue);
    return safeCompare(normalizeBirthdateInput(password), expected ?? '000000');
  }

  return bcrypt.compare(password, String(storedValue));
}

export function formatBirthdateToPassword(value: Date | string): string | null {
  const date = value instanceof Date
    ? value
    : new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) return null;
  return `${String(date.getUTCDate()).padStart(2, '0')}${String(
    date.getUTCMonth() + 1,
  ).padStart(2, '0')}${String(date.getUTCFullYear() % 100).padStart(2, '0')}`;
}

function normalizeBirthdateInput(value: string): string {
  const input = value.trim();
  const fullDate = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fullDate) return `${fullDate[1]}${fullDate[2]}${fullDate[3].slice(-2)}`;
  return input.replace(/\//g, '');
}

function safeCompare(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  const length = Math.max(a.length, b.length);
  let difference = a.length ^ b.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

function isActiveValue(value: unknown): boolean {
  if (value == null || value === true) return true;
  return ['1', 'Y', 'A', 'ACTIVE', 'TRUE'].includes(
    String(value).trim().toUpperCase(),
  );
}

export function generateToken(payload: IJwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): IJwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as IJwtPayload;
}

export function toSafeUser(user: IUser): ISafeUser {
  return {
    id: user.Id,
    name: user.Name,
    username: user.Username,
    role: user.Role,
  };
}

export async function findUserForLogin(
  username: string,
): Promise<IUser & { PasswordHash: string } | null> {
  const pool = await getDbConnection();
  const table = env.HRIS_EMPLOYEE_TABLE;
  const nipColumn = env.HRIS_EMPLOYEE_NIP_COL;
  const birthdateColumn = env.HRIS_EMPLOYEE_BIRTHDATE_COL;
  const employeeResult = await pool
    .request()
    .input('nip', sql.VarChar(50), username.trim())
    .query(
      `SELECT Id_Employee AS Id,
              RTRIM(Name) AS Name,
              RTRIM([${nipColumn}]) AS Username,
              [${birthdateColumn}] AS BirthDate,
              is_Active AS IsActive
       FROM ${table}
       WHERE RTRIM([${nipColumn}]) = @nip`,
    );
  const row = employeeResult.recordset[0];
  if (!row) return null;

  const applicationUser = await ensureApplicationUser(pool, {
    name: row.Name,
    username: row.Username,
  });

  return {
    // CreatedBy, audit logs, and check-in/out foreign keys reference vms.Users.
    Id: applicationUser.Id,
    Name: row.Name,
    Username: row.Username,
    Role: applicationUser.Role,
    IsActive: isActiveValue(row.IsActive) && applicationUser.IsActive,
    BirthDate: row.BirthDate,
    PasswordHash: '',
  };
}

export async function getUserById(id: number): Promise<IUser | null> {
  const pool = await getDbConnection();
  const table = env.HRIS_EMPLOYEE_TABLE;
  const result = await pool
    .request()
    .input('id', sql.Int, id)
    .query(
      `SELECT u.Id, RTRIM(e.Name) AS Name, RTRIM(u.Username) AS Username,
              u.Role, u.IsActive AS UserIsActive, e.is_Active AS EmployeeIsActive,
              e.[${env.HRIS_EMPLOYEE_BIRTHDATE_COL}] AS BirthDate
       FROM vms.Users u
       INNER JOIN ${table} e
         ON RTRIM(e.[${env.HRIS_EMPLOYEE_NIP_COL}]) = RTRIM(u.Username)
       WHERE u.Id = @id`,
    );
  const row = result.recordset[0];
  if (!row) return null;
  return {
    Id: row.Id,
    Name: row.Name,
    Username: row.Username,
    Role: row.Role,
    IsActive: isActiveValue(row.UserIsActive) && isActiveValue(row.EmployeeIsActive),
    BirthDate: row.BirthDate,
  };
}

interface ApplicationUser {
  Id: number;
  Role: string;
  IsActive: boolean;
}

/**
 * Visit and audit tables reference vms.Users. HRIS remains the source of
 * identity and birthdate, while this lightweight application identity keeps
 * those foreign keys valid. The sentinel is not a usable password; login
 * always validates BirthDate above.
 */
async function ensureApplicationUser(
  pool: sql.ConnectionPool,
  employee: { name: string; username: string },
): Promise<ApplicationUser> {
  const existing = await pool
    .request()
    .input('username', sql.VarChar(50), employee.username)
    .query(`
      SELECT Id, Role, IsActive
      FROM vms.Users
      WHERE Username = @username
    `);

  if (existing.recordset[0]) {
    const row = existing.recordset[0];
    return { Id: row.Id, Role: row.Role, IsActive: !!row.IsActive };
  }

  try {
    const created = await pool
      .request()
      .input('name', sql.NVarChar(150), employee.name)
      .input('username', sql.VarChar(50), employee.username)
      .input('passwordHash', sql.VarChar(255), '__HRIS_BIRTHDATE_LOGIN__')
      .input('role', sql.VarChar(20), 'SECURITY')
      .query(`
        INSERT INTO vms.Users (Name, Username, PasswordHash, Role, IsActive)
        OUTPUT INSERTED.Id, INSERTED.Role, INSERTED.IsActive
        VALUES (@name, @username, @passwordHash, @role, 1)
      `);
    const row = created.recordset[0];
    return { Id: row.Id, Role: row.Role, IsActive: !!row.IsActive };
  } catch (error) {
    // Another request may have provisioned the same NIP concurrently.
    const concurrent = await pool
      .request()
      .input('username', sql.VarChar(50), employee.username)
      .query(`
        SELECT Id, Role, IsActive
        FROM vms.Users
        WHERE Username = @username
      `);
    const row = concurrent.recordset[0];
    if (!row) throw error;
    return { Id: row.Id, Role: row.Role, IsActive: !!row.IsActive };
  }
}
