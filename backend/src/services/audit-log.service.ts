import { getDbConnection, sql } from '../config/database';

export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  VISIT_CREATED: 'VISIT_CREATED',
  SAFETY_INDUCTION_COMPLETED: 'SAFETY_INDUCTION_COMPLETED',
  VISIT_CHECKED_IN: 'VISIT_CHECKED_IN',
  VISIT_CHECKED_OUT: 'VISIT_CHECKED_OUT',
  SAFETY_CONFIG_UPDATED: 'SAFETY_CONFIG_UPDATED',
  USER_ACCESS_GRANTED: 'USER_ACCESS_GRANTED',
  USER_ROLE_UPDATED: 'USER_ROLE_UPDATED',
  USER_ACCESS_UPDATED: 'USER_ACCESS_UPDATED',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface AuditLogFilter { action?: string; userId?: number; from?: string; to?: string; q?: string; page?: number; limit?: number; }
export interface PaginatedAuditLogs {
  data: Array<{ Id: number; UserId: number | null; UserName: string | null; Action: string; EntityType: string; EntityId: number | null; Details: string | null; IpAddress: string | null; CreatedAt: Date }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function listAuditLogs(filters: AuditLogFilter = {}): Promise<PaginatedAuditLogs> {
  const page = Math.max(1, filters.page ?? 1); const limit = Math.min(100, Math.max(1, filters.limit ?? 25));
  const conditions: string[] = []; const request = (await getDbConnection()).request();
  if (filters.action) { conditions.push('a.Action = @action'); request.input('action', sql.VarChar(50), filters.action); }
  if (filters.userId !== undefined) { conditions.push('a.UserId = @userId'); request.input('userId', sql.Int, filters.userId); }
  if (filters.from) { conditions.push('a.CreatedAt >= @from'); request.input('from', sql.DateTime2, filters.from); }
  if (filters.to) { conditions.push('a.CreatedAt < DATEADD(day, 1, @to)'); request.input('to', sql.DateTime2, filters.to); }
  if (filters.q) { conditions.push('(a.EntityType LIKE @q OR a.Details LIKE @q OR a.Action LIKE @q)'); request.input('q', sql.NVarChar(200), `%${filters.q}%`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''; const offset = (page - 1) * limit;
  request.input('offset', sql.Int, offset).input('limit', sql.Int, limit);
  const result = await request.query(`SELECT a.Id, a.UserId, u.Name AS UserName, a.Action, a.EntityType, a.EntityId, a.Details, a.IpAddress, a.CreatedAt, COUNT(*) OVER() AS TotalCount FROM vms.AuditLogs a LEFT JOIN vms.Users u ON u.Id = a.UserId ${where} ORDER BY a.CreatedAt DESC, a.Id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
  const total = Number(result.recordset[0]?.TotalCount ?? 0);
  return { data: result.recordset.map(({ TotalCount: _total, ...row }) => row), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export interface IAuditLogEntry {
  userId?: number | null;
  action: AuditAction;
  entityType: string;
  entityId?: number | null;
  details?: string | null;
  ipAddress?: string | null;
}

/**
 * Minimal surface needed to execute an audit INSERT. Satisfied by both the
 * connection pool and an active transaction, so the same call works whether
 * the audit is written standalone or atomically inside a business transaction.
 */
export interface SqlExecutor {
  request(): Pick<sql.Request, 'input' | 'query'>;
}

/**
 * Writes an audit log entry using the given executor (connection pool OR
 * an active transaction). When used inside a transaction the audit write is
 * atomic with the business change (fail-closed policy).
 *
 * Policy: audit insert failures inside a business transaction roll back the
 * transaction. For non-transactional audits (e.g. login) use `tryLogAudit`,
 * which is best-effort and never leaks details.
 */
export async function logAudit(
  executor: SqlExecutor,
  entry: IAuditLogEntry,
): Promise<void> {
  await executor
    .request()
    .input('userId', sql.Int, entry.userId ?? null)
    .input('action', sql.VarChar(50), entry.action)
    .input('entityType', sql.VarChar(50), entry.entityType)
    .input('entityId', sql.Int, entry.entityId ?? null)
    .input('details', sql.NVarChar(2000), entry.details ?? null)
    .input('ipAddress', sql.VarChar(45), entry.ipAddress ?? null)
    .query(`
      INSERT INTO vms.AuditLogs (UserId, Action, EntityType, EntityId, Details, IpAddress)
      VALUES (@userId, @action, @entityType, @entityId, @details, @ipAddress)
    `);
}

/**
 * Best-effort audit for non-transactional flows (login success/failure).
 * A failure here is logged server-side and never surfaced to the client —
 * it must not break authentication or leak sensitive data.
 */
export async function tryLogAudit(entry: IAuditLogEntry): Promise<void> {
  try {
    await logAudit(await getDbConnection(), entry);
  } catch (error) {
    console.error('Audit log write failed (best-effort):', error);
  }
}
