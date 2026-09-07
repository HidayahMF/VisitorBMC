import { getDbConnection, sql } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { getActiveSafetyInductionConfig } from './safety-clearance.service';

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
  ContentType: 'VIDEO' | 'IMAGE';
  ContentUrl: string;
  Title: string | null;
  Description: string | null;
  SortOrder: number;
  IsRequired: boolean;
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
}

export async function getActiveInductionWithContents(): Promise<IInductionContentResponse> {
  const config = await getActiveSafetyInductionConfig();
  const pool = await getDbConnection();

  const contentsResult = await pool
    .request()
    .input('inductionId', sql.Int, config.id)
    .query(`
      SELECT Id, SafetyInductionId, ContentType, ContentUrl, Title, Description, SortOrder, IsRequired, CreatedAt
      FROM SafetyInductionContents
      WHERE SafetyInductionId = @inductionId
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
      CreatedAt: row.CreatedAt,
    })),
  };
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
      FROM VisitorInductionRecords vir
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
): Promise<{ recordId: number; validUntil: Date }> {
  const { visitorId, visitId, acknowledged } = params;

  if (!acknowledged) {
    throw new AppError('Acknowledgement is required', 400);
  }

  const pool = await getDbConnection();
  const config = await getActiveSafetyInductionConfig();

  const visitorCheck = await pool
    .request()
    .input('visitorId', sql.Int, visitorId)
    .query('SELECT Id, VisitorName FROM Visitors WHERE Id = @visitorId AND IsActive = 1');

  if (visitorCheck.recordset.length === 0) {
    throw new AppError('Visitor not found or inactive', 404);
  }

  const visitCheck = await pool
    .request()
    .input('visitId', sql.Int, visitId)
    .query('SELECT Id, Status FROM Visits WHERE Id = @visitId');

  if (visitCheck.recordset.length === 0) {
    throw new AppError('Visit not found', 404);
  }

  const visitVisitorCheck = await pool
    .request()
    .input('visitId', sql.Int, visitId)
    .input('visitorId', sql.Int, visitorId)
    .query('SELECT Id FROM VisitVisitors WHERE VisitId = @visitId AND VisitorId = @visitorId');

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
      .input('acknowledged', sql.Bit, 1)
      .input('createdBy', sql.Int, createdBy)
      .query(`
        INSERT INTO VisitorInductionRecords
          (VisitorId, VisitId, SafetyInductionId, InductionVersion, Acknowledged, AcknowledgedAt, CreatedBy)
        OUTPUT INSERTED.Id, INSERTED.ValidUntil
        VALUES (@visitorId, @visitId, @safetyInductionId, @inductionVersion, @acknowledged, SYSUTCDATETIME(), @createdBy)
      `);

    const recordId = result.recordset[0].Id;
    const validUntil = result.recordset[0].ValidUntil;

    await transaction.commit();

    return { recordId, validUntil };
  } catch (error) {
    if (transactionStarted) await transaction.rollback();
    throw error;
  }
}

export async function listActiveInductions(): Promise<ISafetyInduction[]> {
  const pool = await getDbConnection();

  const result = await pool.request().query(`
    SELECT Id, Title, Version, ValidMonths, IsActive, ForceReinductionOnNewVersion, CreatedAt, UpdatedAt
    FROM SafetyInductions
    WHERE IsActive = 1
    ORDER BY Version DESC
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
