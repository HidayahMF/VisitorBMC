import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { getDbConnection, sql } from '../config/database';

export interface IUser {
  Id: number;
  Name: string;
  Username: string;
  Role: string;
  IsActive: boolean;
}

export interface ISafeUser {
  id: number;
  name: string;
  username: string;
  role: string;
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
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
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
  const result = await pool
    .request()
    .input('username', sql.VarChar(50), username)
    .query(
      `SELECT Id, Name, Username, Role, IsActive, PasswordHash
       FROM Users
       WHERE Username = @username`,
    );
  const row = result.recordset[0];
  if (!row) return null;
  return {
    Id: row.Id,
    Name: row.Name,
    Username: row.Username,
    Role: row.Role,
    IsActive: !!row.IsActive,
    PasswordHash: row.PasswordHash,
  };
}

export async function getUserById(id: number): Promise<IUser | null> {
  const pool = await getDbConnection();
  const result = await pool
    .request()
    .input('id', sql.Int, id)
    .query(
      `SELECT Id, Name, Username, Role, IsActive
       FROM Users
       WHERE Id = @id`,
    );
  const row = result.recordset[0];
  if (!row) return null;
  return {
    Id: row.Id,
    Name: row.Name,
    Username: row.Username,
    Role: row.Role,
    IsActive: !!row.IsActive,
  };
}
