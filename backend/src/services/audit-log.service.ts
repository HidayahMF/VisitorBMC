import { getDbConnection, sql } from '../config/database';

export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  VISIT_CREATED: 'VISIT_CREATED',
  SAFETY_INDUCTION_COMPLETED: 'SAFETY_INDUCTION_COMPLETED',
  VISIT_CHECKED_IN: 'VISIT_CHECKED_IN',
  VISIT_CHECKED_OUT: 'VISIT_CHECKED_OUT',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

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