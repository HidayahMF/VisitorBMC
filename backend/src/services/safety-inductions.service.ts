import { getDbConnection, sql } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { getActiveSafetyInductionConfig, computeVisitorClearance, type SafetyInductionConfig } from './safety-clearance.service';
import { logAudit, type SqlExecutor } from './audit-log.service';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';

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
  CreatedAt: Date;
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

export interface IInductionCompletionResult {
  recordId: number;
  completedAt: Date;
  acknowledgedAt: Date;
  validUntil: Date;
}

export async function getActiveInductionWithContents(): Promise<IInductionContentResponse> {
  const config = await getActiveSafetyInductionConfig();
  const pool = await getDbConnection();

  const contentsResult = await pool
    .request()
    .input('inductionId', sql.Int, config.id)
    .query(`
      SELECT Id, SafetyInductionId, ContentType, ContentUrl, Title, Description, SortOrder, IsRequired, CreatedAt
      FROM vms.SafetyInductionContents
      WHERE SafetyInductionId = @inductionId AND IsActive = 1
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
      CreatedAt: row.CreatedAt,
    })),
  };
}

export async function listManagedInductionContents(): Promise<ISafetyInductionContent[]> {
  const config = await getActiveSafetyInductionConfig();
  const pool = await getDbConnection();
  const result = await pool.request()
    .input('inductionId', sql.Int, config.id)
    .query(`
      SELECT Id, SafetyInductionId, ContentType, ContentUrl, Title, Description,
             SortOrder, IsRequired, IsActive, CreatedAt
      FROM vms.SafetyInductionContents
      WHERE SafetyInductionId = @inductionId
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
    CreatedAt: row.CreatedAt,
  }));
}

export async function createInductionContent(params: {
  file: { filename: string };
  contentType: 'VIDEO' | 'IMAGE' | 'PDF';
  title?: string;
  description?: string;
}): Promise<ISafetyInductionContent> {
  const config = await getActiveSafetyInductionConfig();
  const pool = await getDbConnection();
  const result = await pool.request()
    .input('inductionId', sql.Int, config.id)
    .input('contentType', sql.VarChar(10), params.contentType)
    .input('contentUrl', sql.NVarChar(500), `/uploads/safety-induction/${params.file.filename}`)
    .input('title', sql.NVarChar(200), params.title?.trim() || params.file.filename)
    .input('description', sql.NVarChar(1000), params.description?.trim() || null)
    .query(`
      INSERT INTO vms.SafetyInductionContents
        (SafetyInductionId, ContentType, ContentUrl, Title, Description, SortOrder, IsRequired, IsActive)
      OUTPUT INSERTED.Id, INSERTED.SafetyInductionId, INSERTED.ContentType,
             INSERTED.ContentUrl, INSERTED.Title, INSERTED.Description,
             INSERTED.SortOrder, INSERTED.IsRequired, INSERTED.IsActive, INSERTED.CreatedAt
      SELECT @inductionId, @contentType, @contentUrl, @title, @description,
             COALESCE(MAX(SortOrder), 0) + 1, 1, 0
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
  createdBy: number
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
    await transaction.begin();
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
        INSERT INTO vms.VisitorInductionRecords
          (VisitorId, VisitId, SafetyInductionId, InductionVersion,
           CompletedAt, ValidUntil, Acknowledged, AcknowledgedAt, CreatedBy)
        OUTPUT INSERTED.Id, INSERTED.CompletedAt,
               INSERTED.ValidUntil, INSERTED.AcknowledgedAt
        VALUES (@visitorId, @visitId, @safetyInductionId, @inductionVersion,
                SYSUTCDATETIME(),
                DATEADD(month, @validMonths, SYSUTCDATETIME()),
                @acknowledged, SYSUTCDATETIME(), @createdBy)
      `);

    const recordId = result.recordset[0].Id;
    const completedAt = result.recordset[0].CompletedAt;
    const acknowledgedAt = result.recordset[0].AcknowledgedAt;
    const validUntil = result.recordset[0].ValidUntil;

    await logAudit(transaction, {
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
