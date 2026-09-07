import { getDbConnection, sql } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export type SafetyStatus = 'VALID' | 'REQUIRED' | 'EXPIRED';

export interface VisitorSafetyClearance {
  visitorId: number;
  visitorName: string;
  status: SafetyStatus;
  reason?: 'NEVER_COMPLETED' | 'EXPIRED' | 'NEW_VERSION_REQUIRED';
  lastCompletedAt?: Date;
  validUntil?: Date;
  inductionVersion?: number;
}

export interface SafetyInductionConfig {
  id: number;
  title: string;
  version: number;
  validMonths: number;
  forceReinductionOnNewVersion: boolean;
}

export interface SafetyCheckSummary {
  safetyInduction: SafetyInductionConfig | null;
  summary: {
    totalVisitors: number;
    valid: number;
    required: number;
    expired: number;
    requiresInduction: number;
  };
  visitors: VisitorSafetyClearance[];
}

interface SafetyRecordRow {
  VisitorId: number;
  CompletedAt: Date | null;
  ValidUntil: Date | null;
  InductionVersion: number | null;
}

async function getActiveSafetyInduction(pool: sql.ConnectionPool): Promise<SafetyInductionConfig | null> {
  const result = await pool.request().query(`
    SELECT si.Id, si.Title, si.Version, si.ValidMonths, si.ForceReinductionOnNewVersion
    FROM vms.SafetyInductions si
    WHERE si.IsActive = 1
  `);

  if (result.recordset.length === 0) {
    return null;
  }

  if (result.recordset.length > 1) {
    throw new AppError('Multiple active Safety Inductions configured', 500);
  }

  const row = result.recordset[0];
  return {
    id: row.Id,
    title: row.Title,
    version: row.Version,
    validMonths: row.ValidMonths,
    forceReinductionOnNewVersion: !!row.ForceReinductionOnNewVersion,
  };
}

export async function getActiveSafetyInductionConfig(): Promise<SafetyInductionConfig> {
  const induction = await getActiveSafetyInduction(await getDbConnection());
  if (!induction) {
    throw new AppError('No active Safety Induction configuration found', 500);
  }
  return induction;
}

export async function checkVisitorSafetyClearance(
  visitorIds: number[],
  companyId: number
): Promise<SafetyCheckSummary> {
  const pool = await getDbConnection();

  const companyResult = await pool.request()
    .input('companyId', sql.Int, companyId)
    .query('SELECT c.Id FROM vms.Companies c WHERE c.Id = @companyId AND c.IsActive = 1');
  if (companyResult.recordset.length === 0) {
    throw new AppError('Company not found or inactive', 400);
  }

  if (new Set(visitorIds).size !== visitorIds.length) {
    throw new AppError('Duplicate visitor IDs in request', 400);
  }

  // Verify all visitors belong to the company and are active
  const visitorCheck = await pool
    .request()
    .input('visitorIds', sql.NVarChar, visitorIds.join(','))
    .input('companyId', sql.Int, companyId)
    .query(`
       SELECT v.Id, v.VisitorName
       FROM vms.Visitors v
       WHERE v.Id IN (SELECT value FROM STRING_SPLIT(@visitorIds, ','))
       AND v.CompanyId = @companyId
       AND v.IsActive = 1
    `);

  if (visitorCheck.recordset.length !== visitorIds.length) {
    throw new AppError('Some visitors not found, inactive, or do not belong to this company', 400);
  }

  const inductionConfig = await getActiveSafetyInductionConfig();

  // Fetch history in one query. The latest valid record is preferred; if none
  // is valid, the latest completed record explains the EXPIRED result.
  const placeholders = visitorIds.map((_, i) => `@id${i}`).join(',');
  const request = pool.request();
  visitorIds.forEach((id, i) => {
    request.input(`id${i}`, sql.Int, id);
  });

  const recordsResult = await request.query<SafetyRecordRow>(`
    SELECT
      v.Id as VisitorId,
      v.VisitorName,
      vir.CompletedAt,
      vir.ValidUntil,
      vir.InductionVersion
    FROM vms.Visitors v
    LEFT JOIN vms.VisitorInductionRecords vir ON v.Id = vir.VisitorId
    WHERE v.Id IN (${placeholders})
    ORDER BY v.Id, vir.CompletedAt DESC, vir.Id DESC
  `);

  const now = new Date();
  const visitors = computeVisitorClearance(
    visitorCheck.recordset.map((row) => ({ Id: row.Id, VisitorName: row.VisitorName })),
    recordsResult.recordset,
    inductionConfig,
    now,
  );

  const valid = visitors.filter((v) => v.status === 'VALID').length;
  const required = visitors.filter((v) => v.status === 'REQUIRED').length;
  const expired = visitors.filter((v) => v.status === 'EXPIRED').length;

  return {
    safetyInduction: inductionConfig,
    summary: {
      totalVisitors: visitorIds.length,
      valid,
      required,
      expired,
      requiresInduction: required + expired,
    },
    visitors,
  };
}

interface VisitorIdentity {
  Id: number;
  VisitorName: string;
}

export interface SafetyRecord {
  VisitorId: number;
  CompletedAt: Date | null;
  ValidUntil: Date | null;
  InductionVersion: number | null;
}

/**
 * Pure decision logic for VALID / REQUIRED / EXPIRED.
 * Single source of truth — used by both checkVisitorSafetyClearance
 * (via the connection pool) and completeInduction (inside its transaction).
 */
export function computeVisitorClearance(
  visitorRows: VisitorIdentity[],
  records: SafetyRecord[],
  config: SafetyInductionConfig,
  now: Date,
): VisitorSafetyClearance[] {
  const recordsByVisitor = new Map<number, SafetyRecord[]>();
  for (const row of records) {
    const list = recordsByVisitor.get(row.VisitorId) ?? [];
    list.push(row);
    recordsByVisitor.set(row.VisitorId, list);
  }

  const visitors: VisitorSafetyClearance[] = [];
  for (const visitor of visitorRows) {
    const rows = recordsByVisitor.get(visitor.Id) ?? [];
    const validRecord = rows.find((row) => row.CompletedAt && row.ValidUntil && new Date(row.ValidUntil) > now);
    const row = validRecord ?? rows[0];
    let status: SafetyStatus;
    let reason: VisitorSafetyClearance['reason'];

    if (!row || !row.CompletedAt) {
      status = 'REQUIRED';
      reason = 'NEVER_COMPLETED';
    } else {
      const validUntil = row.ValidUntil ? new Date(row.ValidUntil) : new Date(0);
      const inductionVersion = row.InductionVersion ?? 0;

      if (validUntil <= now) {
        status = 'EXPIRED';
        reason = 'EXPIRED';
      } else if (inductionVersion < config.version && config.forceReinductionOnNewVersion) {
        status = 'REQUIRED';
        reason = 'NEW_VERSION_REQUIRED';
      } else {
        status = 'VALID';
      }
    }

    visitors.push({
      visitorId: visitor.Id,
      visitorName: visitor.VisitorName,
      status,
      reason,
      lastCompletedAt: row.CompletedAt ? new Date(row.CompletedAt) : undefined,
      validUntil: row.ValidUntil ? new Date(row.ValidUntil) : undefined,
      inductionVersion: row.InductionVersion ?? undefined,
    });
  }

  return visitors;
}

export async function determineVisitInitialStatus(
  visitorIds: number[],
  companyId: number
): Promise<'PENDING_INDUCTION' | 'READY_FOR_CHECKIN'> {
  const check = await checkVisitorSafetyClearance(visitorIds, companyId);
  
  if (check.summary.requiresInduction > 0) {
    return 'PENDING_INDUCTION';
  }
  
  return 'READY_FOR_CHECKIN';
}
