import { getDbConnection, sql } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { getActiveSafetyInductionConfig, checkVisitorSafetyClearance, computeVisitorClearance, type SafetyInductionConfig, type SafetyStatus } from './safety-clearance.service';
import { logAudit, type SqlExecutor } from './audit-log.service';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';
import crypto from 'crypto';
import { findCompaniesBySearch } from './companies.service';
import { createVisitor, searchVisitors } from './visitors.service';
import { createVisit } from './visits.service';

export interface ISafetyInduction {
  Id: number;
  Title: string;
  Version: number;
  ValidMonths: number;
  IsActive: boolean;
  ForceReinductionOnNewVersion: boolean;
  CreatedAt: Date;
  UpdatedAt: Date | null;
}

export interface ISafetyInductionContent {
  Id: number;
  SafetyInductionId: number;
  ContentType: 'VIDEO' | 'IMAGE' | 'PDF';
  ContentUrl: string;
  Title: string | null;
  Description: string | null;
  SortOrder: number;
  IsRequired: boolean;
  IsActive: boolean;
  PurposeCategory: 'MEETING' | 'TECHNICAL_SUPPORT';
  CreatedAt: Date;
}

export interface PublicInductionWorkflow {
  visitId: number;
  visitCode: string;
  status: string;
  visitors: Array<{ visitorId: number; visitorName: string; safetyStatus: SafetyStatus; needsInduction: boolean }>;
  requiredCount: number;
  completedCount: number;
  remainingCount: number;
  nextVisitorId: number | null;
  purposeCategory: 'MEETING' | 'TECHNICAL_SUPPORT';
}

const PUBLIC_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;
function tokenHash(token: string): Buffer { return crypto.createHash('sha256').update(token, 'utf8').digest(); }

export async function issuePublicInductionToken(visitId: number): Promise<{ token: string; expiresAt: Date }> {
  const pool = await getDbConnection();
  const visit = await pool.request().input('visitId', sql.Int, visitId).query('SELECT Id, Status FROM vms.Visits WHERE Id=@visitId');
  if (!visit.recordset[0]) throw new AppError('Visit not found', 404);
  if (!['PENDING_INDUCTION', 'READY_FOR_CHECKIN'].includes(visit.recordset[0].Status)) throw new AppError('Visit is not eligible for induction', 400);
  const token = crypto.randomBytes(32).toString('base64url'); const expiresAt = new Date(Date.now() + PUBLIC_TOKEN_TTL_MS);
  await pool.request().input('visitId', sql.Int, visitId).input('hash', sql.VarBinary(32), tokenHash(token)).input('expiresAt', sql.DateTime2, expiresAt).query('UPDATE vms.Visits SET InductionAccessTokenHash=@hash, InductionAccessTokenExpiresAt=@expiresAt, UpdatedAt=SYSUTCDATETIME() WHERE Id=@visitId');
  return { token, expiresAt };
}

async function visitIdFromToken(token: string): Promise<number> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new AppError('Invalid induction access token', 401);
  const result = await (await getDbConnection()).request().input('hash', sql.VarBinary(32), tokenHash(token)).query('SELECT Id FROM vms.Visits WHERE InductionAccessTokenHash=@hash AND InductionAccessTokenExpiresAt>SYSUTCDATETIME()');
  if (!result.recordset[0]) throw new AppError('Invalid or expired induction access token', 401);
  return result.recordset[0].Id;
}

export async function getPublicInductionWorkflowByToken(token: string): Promise<PublicInductionWorkflow> { return getPublicInductionWorkflow(await visitIdFromToken(token)); }

export async function completeInductionByToken(token: string, visitorId: number, acknowledged: boolean, ipAddress?: string): Promise<{ result: IInductionCompletionResult; workflow: PublicInductionWorkflow }> {
  const visitId = await visitIdFromToken(token); const workflow = await getPublicInductionWorkflow(visitId);
  const target = workflow.visitors.find((visitor) => visitor.visitorId === visitorId);
  if (!target) throw new AppError('Visitor is not part of this visit', 403);
  const next = workflow.visitors.find((visitor) => visitor.needsInduction);
  if (target.needsInduction && (!next || next.visitorId !== visitorId)) throw new AppError('Visitor is not the next visitor requiring induction', 409);
  const result = await completeInduction({ visitorId, visitId, acknowledged, ipAddress }, null);
  return { result, workflow: await getPublicInductionWorkflow(visitId) };
}

export async function completeGroupInductionByToken(
  token: string,
  visitorIds: number[],
  acknowledged: boolean,
  ipAddress?: string,
): Promise<{ workflow: PublicInductionWorkflow }> {
  if (!acknowledged || !Array.isArray(visitorIds) || visitorIds.length === 0) {
    throw new AppError('All visitors must be acknowledged', 400);
  }

  const visitId = await visitIdFromToken(token);
  const workflow = await getPublicInductionWorkflow(visitId);
  const expectedIds = workflow.visitors.map((visitor) => visitor.visitorId).sort((a, b) => a - b);
  const submittedIds = [...new Set(visitorIds)].sort((a, b) => a - b);
  if (expectedIds.length !== submittedIds.length || expectedIds.some((id, index) => id !== submittedIds[index])) {
    throw new AppError('The visitor list does not match this visit', 400);
  }

  for (const visitorId of submittedIds) {
    await completeInduction({ visitorId, visitId, acknowledged: true, ipAddress }, null);
  }

  const pool = await getDbConnection();
  await pool.request()
    .input('visitId', sql.Int, visitId)
    .query(`
      UPDATE vms.Visits
      SET Status = 'IN', CheckInTime = COALESCE(CheckInTime, SYSUTCDATETIME()), UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @visitId AND Status IN ('PENDING_INDUCTION', 'READY_FOR_CHECKIN')
    `);

  return { workflow: await getPublicInductionWorkflow(visitId) };
}

export async function getPublicInductionWorkflow(visitId: number): Promise<PublicInductionWorkflow> {
  const pool = await getDbConnection();
  const visitResult = await pool.request().input('visitId', sql.Int, visitId).query(`
    SELECT v.Id, v.VisitCode, v.CompanyId, v.Status, v.PurposeCategory
    FROM vms.Visits v WHERE v.Id = @visitId
  `);
  const visit = visitResult.recordset[0];
  if (!visit) throw new AppError('Visit not found', 404);
  const visitorResult = await pool.request().input('visitId', sql.Int, visitId).query(`
    SELECT vis.Id, vis.VisitorName FROM vms.VisitVisitors vv
    INNER JOIN vms.Visitors vis ON vis.Id = vv.VisitorId
    WHERE vv.VisitId = @visitId AND vis.IsActive = 1 ORDER BY vis.Id
  `);
  const clearance = await checkVisitorSafetyClearance(visitorResult.recordset.map((row) => row.Id), visit.CompanyId);
  const visitors = visitorResult.recordset.map((row) => {
    const safety = clearance.visitors.find((item) => item.visitorId === row.Id);
    const safetyStatus = safety?.status ?? 'REQUIRED';
    return { visitorId: row.Id, visitorName: row.VisitorName, safetyStatus, needsInduction: safetyStatus !== 'VALID' };
  });
  const remaining = visitors.filter((visitor) => visitor.needsInduction);
  return { visitId, visitCode: visit.VisitCode, status: visit.Status, visitors, requiredCount: remaining.length, completedCount: visitors.length - remaining.length, remainingCount: remaining.length, nextVisitorId: remaining[0]?.visitorId ?? null, purposeCategory: visit.PurposeCategory };
}

export interface IVisitorInductionRecord {
  Id: number;
  VisitorId: number;
  VisitId: number | null;
  SafetyInductionId: number;
  InductionVersion: number;
  CompletedAt: Date;
  ValidUntil: Date;
  Acknowledged: boolean;
  AcknowledgedAt: Date | null;
  CreatedBy: number | null;
  CreatedAt: Date;
}

export interface IInductionContentResponse {
  induction: {
    id: number;
    title: string;
    version: number;
    validMonths: number;
  };
  contents: ISafetyInductionContent[];
}

export interface ICompleteInductionParams {
  visitorId: number;
  visitId: number;
  acknowledged: boolean;
  ipAddress?: string;
}

export interface IPublicRegistrationParams {
  companyName: string;
  hostName: string;
  purpose: string;
  purposeCategory: 'MEETING' | 'TECHNICAL_SUPPORT';
  visitors: Array<{ name: string; phoneNumber?: string }>;
  ipAddress?: string;
}

export interface IPublicRegistrationResult {
  visitId: number;
  visitCode: string;
  token: string;
  expiresAt: Date;
  visitors: Array<{ id: number; name: string }>;
}

export interface IInductionCompletionResult {
  recordId: number;
  completedAt: Date;
  acknowledgedAt: Date;
  validUntil: Date;
}

export async function createPublicVisit(
  params: IPublicRegistrationParams,
): Promise<IPublicRegistrationResult> {
  const companyName = params.companyName?.trim();
  const hostName = params.hostName?.trim();
  const purpose = params.purpose?.trim();
  const visitors = params.visitors
    .map((visitor) => ({ name: visitor.name.trim(), phoneNumber: visitor.phoneNumber?.trim() }))
    .filter((visitor) => visitor.name);

   if (!companyName || !hostName || !purpose || !['MEETING', 'TECHNICAL_SUPPORT'].includes(params.purposeCategory) || visitors.length === 0 || visitors.length > 20) {
    throw new AppError('Company, host, purpose, and 1-20 visitors are required', 400);
  }

  const matches = await findCompaniesBySearch(companyName, 20);
  const existing = matches.find((company) => company.IsActive && company.CompanyName.toLowerCase() === companyName.toLowerCase());
  if (!existing) throw new AppError('Perusahaan harus dipilih dari daftar perusahaan BMC', 400);
  const company = existing;
  const createdVisitors: Array<{ id: number; name: string }> = [];

  for (const visitor of visitors) {
    const existingVisitors = await searchVisitors(visitor.name, 20);
    const existing = existingVisitors.find((candidate) =>
      candidate.CompanyId === company.Id && candidate.VisitorName.toLowerCase() === visitor.name.toLowerCase(),
    );
    if (existing) {
      createdVisitors.push({ id: existing.Id, name: existing.VisitorName });
      continue;
    }
    const created = await createVisitor({ visitorName: visitor.name, companyId: company.Id, phoneNumber: visitor.phoneNumber || undefined });
    createdVisitors.push({ id: created.visitor.Id, name: created.visitor.VisitorName });
  }

  const pool = await getDbConnection();
  const userResult = await pool.request().query(`
    SELECT TOP 1 Id FROM vms.Users WHERE IsActive = 1 AND Role IN ('SECURITY', 'ADMIN') ORDER BY Id
  `);
  const systemUserId = userResult.recordset[0]?.Id;
  if (!systemUserId) throw new AppError('No active security operator is configured', 503);

  const today = new Date().toISOString().slice(0, 10);
  const visit = await createVisit({
    companyId: company.Id,
    hostName,
     purpose,
     purposeCategory: params.purposeCategory,
    visitDate: today,
    visitorIds: createdVisitors.map((visitor) => visitor.id),
    ipAddress: params.ipAddress,
  }, systemUserId);
   const activeContents = await getActiveInductionWithContents(params.purposeCategory);
   const access = activeContents.contents.length > 0
     ? await issuePublicInductionToken(visit.Id)
     : { token: '', expiresAt: new Date(0) };

  return {
    visitId: visit.Id,
    visitCode: visit.VisitCode,
    token: access.token,
    expiresAt: access.expiresAt,
    visitors: createdVisitors,
  };
}

export async function getActiveInductionWithContents(purposeCategory?: 'MEETING' | 'TECHNICAL_SUPPORT'): Promise<IInductionContentResponse> {
  const config = await getActiveSafetyInductionConfig();
  const pool = await getDbConnection();

  const contentsResult = await pool
    .request()
    .input('inductionId', sql.Int, config.id)
    .input('purposeCategory', sql.VarChar(30), purposeCategory ?? 'TECHNICAL_SUPPORT')
    .query(`
       SELECT Id, SafetyInductionId, ContentType, ContentUrl, Title, Description, SortOrder, IsRequired, IsActive, CreatedAt, PurposeCategory
      FROM vms.SafetyInductionContents
       WHERE SafetyInductionId = @inductionId AND IsActive = 1 AND PurposeCategory = @purposeCategory
      ORDER BY SortOrder ASC
    `);

  return {
    induction: {
      id: config.id,
      title: config.title,
      version: config.version,
      validMonths: config.validMonths,
    },
    contents: contentsResult.recordset.map((row) => ({
      Id: row.Id,
      SafetyInductionId: row.SafetyInductionId,
      ContentType: row.ContentType,
      ContentUrl: row.ContentUrl,
      Title: row.Title,
      Description: row.Description,
      SortOrder: row.SortOrder,
      IsRequired: !!row.IsRequired,
       IsActive: !!row.IsActive,
       PurposeCategory: row.PurposeCategory,
      CreatedAt: row.CreatedAt,
    })),
  };
}

export async function listManagedInductionContents(purposeCategory?: 'MEETING' | 'TECHNICAL_SUPPORT'): Promise<ISafetyInductionContent[]> {
  const config = await getActiveSafetyInductionConfig();
  const pool = await getDbConnection();
  const request = pool.request()
    .input('inductionId', sql.Int, config.id)
    .input('purposeCategory', sql.VarChar(30), purposeCategory ?? null);
  const result = await request.query(`
      SELECT Id, SafetyInductionId, ContentType, ContentUrl, Title, Description,
             SortOrder, IsRequired, IsActive, CreatedAt
             , PurposeCategory
      FROM vms.SafetyInductionContents
       WHERE SafetyInductionId = @inductionId
         AND (@purposeCategory IS NULL OR PurposeCategory = @purposeCategory)
      ORDER BY SortOrder ASC, Id ASC
    `);

  return result.recordset.map((row) => ({
    Id: row.Id,
    SafetyInductionId: row.SafetyInductionId,
    ContentType: row.ContentType,
    ContentUrl: row.ContentUrl,
    Title: row.Title,
    Description: row.Description,
    SortOrder: row.SortOrder,
    IsRequired: !!row.IsRequired,
    IsActive: !!row.IsActive,
    PurposeCategory: row.PurposeCategory,
    CreatedAt: row.CreatedAt,
  }));
}

export async function createInductionContent(params: {
  file: { filename: string };
  contentType: 'VIDEO' | 'IMAGE' | 'PDF';
  title?: string;
  description?: string;
  purposeCategory: 'MEETING' | 'TECHNICAL_SUPPORT';
}): Promise<ISafetyInductionContent> {
  const config = await getActiveSafetyInductionConfig();
  const pool = await getDbConnection();
  const result = await pool.request()
    .input('inductionId', sql.Int, config.id)
    .input('contentType', sql.VarChar(10), params.contentType)
    .input('contentUrl', sql.NVarChar(500), `/uploads/safety-induction/${params.file.filename}`)
    .input('title', sql.NVarChar(200), params.title?.trim() || params.file.filename)
    .input('description', sql.NVarChar(1000), params.description?.trim() || null)
    .input('purposeCategory', sql.VarChar(30), params.purposeCategory)
    .query(`
      INSERT INTO vms.SafetyInductionContents
        (SafetyInductionId, ContentType, ContentUrl, Title, Description, SortOrder, IsRequired, IsActive, PurposeCategory)
      OUTPUT INSERTED.Id, INSERTED.SafetyInductionId, INSERTED.ContentType,
             INSERTED.ContentUrl, INSERTED.Title, INSERTED.Description,
              INSERTED.SortOrder, INSERTED.IsRequired, INSERTED.IsActive, INSERTED.PurposeCategory, INSERTED.CreatedAt
       SELECT @inductionId, @contentType, @contentUrl, @title, @description,
              COALESCE(MAX(SortOrder), 0) + 1, 1, 0, @purposeCategory
      FROM vms.SafetyInductionContents
      WHERE SafetyInductionId = @inductionId
    `);

  const row = result.recordset[0];
  return {
    Id: row.Id,
    SafetyInductionId: row.SafetyInductionId,
    ContentType: row.ContentType,
    ContentUrl: row.ContentUrl,
    Title: row.Title,
    Description: row.Description,
    SortOrder: row.SortOrder,
    IsRequired: !!row.IsRequired,
    IsActive: !!row.IsActive,
    PurposeCategory: row.PurposeCategory,
    CreatedAt: row.CreatedAt,
  };
}

export async function updateInductionContentStatus(id: number, isActive: boolean): Promise<boolean> {
  const config = await getActiveSafetyInductionConfig();
  const pool = await getDbConnection();
  if (!isActive) {
    const activeCount = await pool.request()
      .input('inductionId', sql.Int, config.id)
      .query('SELECT COUNT(*) AS total FROM vms.SafetyInductionContents WHERE SafetyInductionId = @inductionId AND IsActive = 1');
    const current = await pool.request()
      .input('id', sql.Int, id)
      .input('inductionId', sql.Int, config.id)
      .query('SELECT IsActive FROM vms.SafetyInductionContents WHERE Id = @id AND SafetyInductionId = @inductionId');
    if (current.recordset[0]?.IsActive && activeCount.recordset[0].total <= 1) {
      throw new AppError('At least one induction content must remain active', 400);
    }
  }
  const result = await pool.request()
    .input('id', sql.Int, id)
    .input('inductionId', sql.Int, config.id)
    .input('isActive', sql.Bit, isActive ? 1 : 0)
    .query(`
      UPDATE vms.SafetyInductionContents
      SET IsActive = @isActive
      WHERE Id = @id AND SafetyInductionId = @inductionId
    `);
  return (result.rowsAffected?.[0] ?? 0) > 0;
}

export async function deleteInductionContent(id: number): Promise<boolean> {
  const config = await getActiveSafetyInductionConfig();
  const pool = await getDbConnection();
  const current = await pool.request()
    .input('id', sql.Int, id)
    .input('inductionId', sql.Int, config.id)
    .query('SELECT IsActive FROM vms.SafetyInductionContents WHERE Id = @id AND SafetyInductionId = @inductionId');
  if (current.recordset[0]?.IsActive) {
    const activeCount = await pool.request()
      .input('inductionId', sql.Int, config.id)
      .query('SELECT COUNT(*) AS total FROM vms.SafetyInductionContents WHERE SafetyInductionId = @inductionId AND IsActive = 1');
    if (activeCount.recordset[0].total <= 1) {
      throw new AppError('At least one induction content must remain active', 400);
    }
  }
  const result = await pool.request()
    .input('id', sql.Int, id)
    .input('inductionId', sql.Int, config.id)
    .query(`
      DELETE FROM vms.SafetyInductionContents
      OUTPUT DELETED.ContentUrl
      WHERE Id = @id AND SafetyInductionId = @inductionId
    `);
  const contentUrl = result.recordset[0]?.ContentUrl as string | undefined;
  if (!contentUrl) return false;

  if (contentUrl.startsWith('/uploads/')) {
    const filePath = path.resolve(env.UPLOAD_DIR, contentUrl.replace(/^\/uploads\//, ''));
    if (filePath.startsWith(path.resolve(env.UPLOAD_DIR))) {
      await fs.unlink(filePath).catch(() => undefined);
    }
  }
  return true;
}

export async function getInductionHistory(visitorId: number): Promise<IVisitorInductionRecord[]> {
  const pool = await getDbConnection();

  const result = await pool
    .request()
    .input('visitorId', sql.Int, visitorId)
    .query(`
      SELECT vir.Id, vir.VisitorId, vir.VisitId, vir.SafetyInductionId,
             vir.InductionVersion, vir.CompletedAt, vir.ValidUntil,
             vir.Acknowledged, vir.AcknowledgedAt, vir.CreatedBy, vir.CreatedAt
      FROM vms.VisitorInductionRecords vir
      WHERE vir.VisitorId = @visitorId
      ORDER BY vir.CompletedAt DESC
    `);

  return result.recordset.map((row) => ({
    Id: row.Id,
    VisitorId: row.VisitorId,
    VisitId: row.VisitId,
    SafetyInductionId: row.SafetyInductionId,
    InductionVersion: row.InductionVersion,
    CompletedAt: row.CompletedAt,
    ValidUntil: row.ValidUntil,
    Acknowledged: !!row.Acknowledged,
    AcknowledgedAt: row.AcknowledgedAt,
    CreatedBy: row.CreatedBy,
    CreatedAt: row.CreatedAt,
  }));
}

export async function completeInduction(
  params: ICompleteInductionParams,
  createdBy: number | null
): Promise<IInductionCompletionResult> {
  const { visitorId, visitId, acknowledged, ipAddress } = params;

  if (!acknowledged) {
    throw new AppError('Acknowledgement is required', 400);
  }

  const pool = await getDbConnection();
  const config = await getActiveSafetyInductionConfig();

  const visitorCheck = await pool
    .request()
    .input('visitorId', sql.Int, visitorId)
    .query('SELECT v.Id, v.VisitorName FROM vms.Visitors v WHERE v.Id = @visitorId AND v.IsActive = 1');

  if (visitorCheck.recordset.length === 0) {
    throw new AppError('Visitor not found or inactive', 404);
  }

  const visitCheck = await pool
    .request()
    .input('visitId', sql.Int, visitId)
    .query('SELECT Id, Status FROM vms.Visits WHERE Id = @visitId');

  if (visitCheck.recordset.length === 0) {
    throw new AppError('Visit not found', 404);
  }

  const visitVisitorCheck = await pool
    .request()
    .input('visitId', sql.Int, visitId)
    .input('visitorId', sql.Int, visitorId)
    .query('SELECT Id FROM vms.VisitVisitors WHERE VisitId = @visitId AND VisitorId = @visitorId');

  if (visitVisitorCheck.recordset.length === 0) {
    throw new AppError('Visitor is not part of this visit', 400);
  }

  const transaction = new sql.Transaction(pool);
  let transactionStarted = false;

  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    transactionStarted = true;

    const result = await transaction
      .request()
      .input('visitorId', sql.Int, visitorId)
      .input('visitId', sql.Int, visitId)
      .input('safetyInductionId', sql.Int, config.id)
      .input('inductionVersion', sql.Int, config.version)
      .input('validMonths', sql.Int, config.validMonths)
      .input('acknowledged', sql.Bit, 1)
      .input('createdBy', sql.Int, createdBy)
      .query(`
        IF EXISTS (
          SELECT 1 FROM vms.VisitorInductionRecords WITH (UPDLOCK, HOLDLOCK)
          WHERE VisitorId = @visitorId AND VisitId = @visitId
            AND SafetyInductionId = @safetyInductionId
            AND ValidUntil > SYSUTCDATETIME()
        )
        BEGIN
          SELECT TOP 1 Id, CompletedAt, ValidUntil, AcknowledgedAt, 1 AS AlreadyExists
          FROM vms.VisitorInductionRecords
          WHERE VisitorId = @visitorId AND VisitId = @visitId
            AND SafetyInductionId = @safetyInductionId
            AND ValidUntil > SYSUTCDATETIME()
          ORDER BY CompletedAt DESC, Id DESC;
        END
        ELSE
        INSERT INTO vms.VisitorInductionRecords
          (VisitorId, VisitId, SafetyInductionId, InductionVersion,
           CompletedAt, ValidUntil, Acknowledged, AcknowledgedAt, CreatedBy)
        OUTPUT INSERTED.Id, INSERTED.CompletedAt,
               INSERTED.ValidUntil, INSERTED.AcknowledgedAt, 0 AS AlreadyExists
        VALUES (@visitorId, @visitId, @safetyInductionId, @inductionVersion,
                SYSUTCDATETIME(),
                DATEADD(month, @validMonths, SYSUTCDATETIME()),
                @acknowledged, SYSUTCDATETIME(), @createdBy)
      `);

    const recordId = result.recordset[0].Id;
    const completedAt = result.recordset[0].CompletedAt;
    const acknowledgedAt = result.recordset[0].AcknowledgedAt;
    const validUntil = result.recordset[0].ValidUntil;

    if (!result.recordset[0].AlreadyExists) await logAudit(transaction, {
      userId: createdBy,
      action: 'SAFETY_INDUCTION_COMPLETED',
      entityType: 'VisitorInductionRecord',
      entityId: recordId,
      details: JSON.stringify({
        visitorId,
        visitId,
        inductionVersion: config.version,
        validMonths: config.validMonths,
      }),
      ipAddress: ipAddress ?? null,
    });

    // Advance PENDING_INDUCTION -> READY_FOR_CHECKIN once every visitor of
    // this visit is cleared. Reuses the same clearance rule as
    // checkVisitorSafetyClearance (single source of truth).
    await maybeAdvanceToReadyForCheckin(transaction, visitId, config);

    await transaction.commit();

    return { recordId, completedAt, acknowledgedAt, validUntil };
  } catch (error) {
    if (transactionStarted) await transaction.rollback();
    throw error;
  }
}

async function maybeAdvanceToReadyForCheckin(
  executor: SqlExecutor,
  visitId: number,
  config: SafetyInductionConfig,
): Promise<void> {
  const result = await executor.request()
    .input('visitId', sql.Int, visitId)
    .query(`
      SELECT vis.Id, vis.VisitorName, vir.CompletedAt, vir.ValidUntil, vir.InductionVersion
      FROM vms.Visitors vis
      INNER JOIN vms.VisitVisitors vv ON vis.Id = vv.VisitorId
      LEFT JOIN vms.VisitorInductionRecords vir ON vis.Id = vir.VisitorId
      WHERE vv.VisitId = @visitId
    `);

  const visitors = computeVisitorClearance(
    result.recordset.map((row) => ({ Id: row.Id, VisitorName: row.VisitorName })),
    result.recordset.map((row) => ({
      VisitorId: row.Id,
      CompletedAt: row.CompletedAt,
      ValidUntil: row.ValidUntil,
      InductionVersion: row.InductionVersion,
    })),
    config,
    new Date(),
  );

  const stillRequiresInduction = visitors.some((v) => v.status !== 'VALID');
  if (!stillRequiresInduction) {
    await executor.request()
      .input('visitId', sql.Int, visitId)
      .query(`
        UPDATE vms.Visits
        SET Status = 'READY_FOR_CHECKIN', UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @visitId AND Status = 'PENDING_INDUCTION'
      `);
  }
}

export async function listActiveInductions(): Promise<ISafetyInduction[]> {
  const pool = await getDbConnection();

  const result = await pool.request().query(`
    SELECT si.Id, si.Title, si.Version, si.ValidMonths, si.IsActive, si.ForceReinductionOnNewVersion, si.CreatedAt, si.UpdatedAt
    FROM vms.SafetyInductions si
    WHERE si.IsActive = 1
    ORDER BY si.Version DESC
  `);

  return result.recordset.map((row) => ({
    Id: row.Id,
    Title: row.Title,
    Version: row.Version,
    ValidMonths: row.ValidMonths,
    IsActive: !!row.IsActive,
    ForceReinductionOnNewVersion: !!row.ForceReinductionOnNewVersion,
    CreatedAt: row.CreatedAt,
    UpdatedAt: row.UpdatedAt,
  }));
}

export async function updateActiveInductionConfig(params: { validMonths: number; forceReinductionOnNewVersion: boolean }, userId: number, ipAddress?: string): Promise<ISafetyInduction> {
  if (!Number.isInteger(params.validMonths) || params.validMonths < 1 || params.validMonths > 120) throw new AppError('ValidMonths must be between 1 and 120', 400);
  const pool = await getDbConnection(); const result = await pool.request().input('validMonths', sql.Int, params.validMonths).input('force', sql.Bit, params.forceReinductionOnNewVersion ? 1 : 0).query(`UPDATE vms.SafetyInductions SET ValidMonths=@validMonths, ForceReinductionOnNewVersion=@force, UpdatedAt=SYSUTCDATETIME() OUTPUT INSERTED.Id, INSERTED.Title, INSERTED.Version, INSERTED.ValidMonths, INSERTED.IsActive, INSERTED.ForceReinductionOnNewVersion, INSERTED.CreatedAt, INSERTED.UpdatedAt WHERE IsActive=1`);
  const row = result.recordset[0]; if (!row) throw new AppError('No active Safety Induction configuration found', 404);
  await logAudit(pool, { userId, action: 'SAFETY_CONFIG_UPDATED', entityType: 'SafetyInduction', entityId: row.Id, details: JSON.stringify({ validMonths: params.validMonths, forceReinductionOnNewVersion: params.forceReinductionOnNewVersion }), ipAddress: ipAddress ?? null });
  return { Id: row.Id, Title: row.Title, Version: row.Version, ValidMonths: row.ValidMonths, IsActive: !!row.IsActive, ForceReinductionOnNewVersion: !!row.ForceReinductionOnNewVersion, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt };
}
