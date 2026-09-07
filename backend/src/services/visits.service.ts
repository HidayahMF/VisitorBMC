import { getDbConnection, sql } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { checkVisitorSafetyClearance } from './safety-clearance.service';

export interface IVisit {
  Id: number;
  VisitCode: string;
  CompanyId: number;
  CompanyName: string;
  HostName: string;
  Purpose: string;
  VisitDate: Date;
  CheckInTime: Date | null;
  CheckOutTime: Date | null;
  Status: 'PENDING_INDUCTION' | 'READY_FOR_CHECKIN' | 'IN' | 'OUT' | 'CANCELLED';
  CreatedBy: number;
  CheckedOutBy: number | null;
  CreatedAt: Date;
  UpdatedAt: Date | null;
  VisitorCount?: number;
}

export interface IVisitDetail extends Omit<IVisit, 'CompanyId' | 'CompanyName'> {
  Company: {
    Id: number;
    CompanyName: string;
  };
  Visitors: IVisitVisitor[];
  SafetySummary: {
    totalVisitors: number;
    cleared: number;
    requiresInduction: number;
  };
}

export interface IVisitVisitor {
  Id: number;
  VisitorCode: string;
  VisitorName: string;
  PhoneNumber: string | null;
  SafetyStatus: 'VALID' | 'REQUIRED' | 'EXPIRED';
  ValidUntil?: Date;
}

export interface IPaginatedVisits {
  data: IVisit[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ICreateVisitParams {
  companyId: number;
  hostName: string;
  purpose: string;
  visitDate: string;
  visitorIds: number[];
}

const MAX_PAGE_SIZE = 100;

function toVisit(row: IVisit): IVisit {
  return {
    Id: row.Id,
    VisitCode: row.VisitCode,
    CompanyId: row.CompanyId,
    CompanyName: row.CompanyName,
    HostName: row.HostName,
    Purpose: row.Purpose,
    VisitDate: row.VisitDate,
    CheckInTime: row.CheckInTime || null,
    CheckOutTime: row.CheckOutTime || null,
    Status: row.Status,
    CreatedBy: row.CreatedBy,
    CheckedOutBy: row.CheckedOutBy || null,
    CreatedAt: row.CreatedAt,
    UpdatedAt: row.UpdatedAt,
    VisitorCount: row.VisitorCount,
  };
}

async function generateVisitCode(transaction: sql.Transaction, visitDate: string): Promise<string> {
  const result = await transaction.request()
    .input('visitDate', sql.Date, visitDate)
    .query(`
      SELECT Counter FROM VisitDailyCounters WITH (UPDLOCK, HOLDLOCK)
      WHERE VisitDate = @visitDate
    `);

  let counter = 1;
  if (result.recordset.length === 0) {
    await transaction.request()
      .input('visitDate', sql.Date, visitDate)
      .input('counter', sql.Int, counter)
      .query('INSERT INTO VisitDailyCounters (VisitDate, Counter) VALUES (@visitDate, @counter)');
  } else {
    counter = result.recordset[0].Counter + 1;
    await transaction.request()
      .input('visitDate', sql.Date, visitDate)
      .input('counter', sql.Int, counter)
      .query('UPDATE VisitDailyCounters SET Counter = @counter, UpdatedAt = SYSUTCDATETIME() WHERE VisitDate = @visitDate');
  }

  return `VIS-${visitDate.replace(/-/g, '')}-${String(counter).padStart(3, '0')}`;
}

export async function listVisits(params: {
  q?: string;
  status?: string;
  companyId?: number;
  date?: string;
  page?: number;
  limit?: number;
}): Promise<IPaginatedVisits> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, params.limit ?? 20));
  const offset = (page - 1) * limit;

  const pool = await getDbConnection();

  let whereClause = '';
  const conditions: string[] = [];

  if (params.q) {
    conditions.push(`(v.VisitCode LIKE @q OR v.HostName LIKE @q OR EXISTS (
      SELECT 1
      FROM VisitVisitors searchVv
      INNER JOIN Visitors searchVisitor ON searchVv.VisitorId = searchVisitor.Id
      WHERE searchVv.VisitId = v.Id AND searchVisitor.VisitorName LIKE @q
    ))`);
  }
  if (params.status) {
    conditions.push('v.Status = @status');
  }
  if (params.companyId !== undefined) {
    conditions.push('v.CompanyId = @companyId');
  }
  if (params.date) {
    conditions.push('v.VisitDate = @date');
  }

  if (conditions.length > 0) {
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }

  const request = pool.request();
  if (params.q) request.input('q', sql.NVarChar, `%${params.q}%`);
  if (params.status) request.input('status', sql.VarChar(20), params.status);
  if (params.companyId !== undefined) request.input('companyId', sql.Int, params.companyId);
  if (params.date) request.input('date', sql.Date, params.date);
  request.input('limit', sql.Int, limit);
  request.input('offset', sql.Int, offset);

  const countRequest = pool.request();
  if (params.q) countRequest.input('q', sql.NVarChar, `%${params.q}%`);
  if (params.status) countRequest.input('status', sql.VarChar(20), params.status);
  if (params.companyId !== undefined) countRequest.input('companyId', sql.Int, params.companyId);
  if (params.date) countRequest.input('date', sql.Date, params.date);

  const countResult = await countRequest.query<{ total: number }>(`
    SELECT COUNT(DISTINCT v.Id) AS total
    FROM Visits v
    LEFT JOIN VisitVisitors vv ON v.Id = vv.VisitId
    LEFT JOIN Visitors vis ON vv.VisitorId = vis.Id
    ${whereClause}
  `);
  const total = countResult.recordset[0].total;

  const dataResult = await request.query(`
     SELECT v.Id, v.VisitCode, v.CompanyId, c.CompanyName, v.HostName, v.Purpose, v.VisitDate,
            v.CheckInTime, v.CheckOutTime, v.Status, v.CreatedBy, v.CheckedOutBy,
             v.CreatedAt, v.UpdatedAt,
             (SELECT COUNT(*) FROM VisitVisitors vv2 WHERE vv2.VisitId = v.Id) AS VisitorCount
     FROM Visits v
     INNER JOIN Companies c ON v.CompanyId = c.Id
    ${whereClause}
    ORDER BY v.Id DESC
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY
  `);

  return {
    data: dataResult.recordset.map(toVisit),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getVisitById(id: number): Promise<IVisitDetail | null> {
  const pool = await getDbConnection();

  const visitResult = await pool
    .request()
    .input('id', sql.Int, id)
    .query(`
      SELECT v.Id, v.VisitCode, v.CompanyId, v.HostName, v.Purpose, v.VisitDate,
             v.CheckInTime, v.CheckOutTime, v.Status, v.CreatedBy, v.CheckedOutBy,
             v.CreatedAt, v.UpdatedAt,
             c.CompanyName
      FROM Visits v
      INNER JOIN Companies c ON v.CompanyId = c.Id
      WHERE v.Id = @id
    `);

  const visitRow = visitResult.recordset[0];
  if (!visitRow) return null;

  const visitorsResult = await pool.request()
    .input('visitId', sql.Int, id)
    .query(`
      SELECT vis.Id, vis.VisitorCode, vis.VisitorName, vis.PhoneNumber
      FROM VisitVisitors vv
      INNER JOIN Visitors vis ON vv.VisitorId = vis.Id
      WHERE vv.VisitId = @visitId
      ORDER BY vis.Id
    `);
  const clearance = await checkVisitorSafetyClearance(
    visitorsResult.recordset.map((row) => row.Id),
    visitRow.CompanyId,
  );
  const visitors: IVisitVisitor[] = visitorsResult.recordset.map((row) => {
    const safety = clearance.visitors.find((item) => item.visitorId === row.Id);
    return {
      Id: row.Id,
      VisitorCode: row.VisitorCode,
      VisitorName: row.VisitorName,
      PhoneNumber: row.PhoneNumber || null,
      SafetyStatus: safety?.status ?? 'REQUIRED',
      ValidUntil: safety?.validUntil,
    };
  });

  const cleared = visitors.filter(v => v.SafetyStatus === 'VALID').length;
  const requiresInduction = visitors.filter(v => v.SafetyStatus !== 'VALID').length;

  return {
    Id: visitRow.Id,
    VisitCode: visitRow.VisitCode,
    HostName: visitRow.HostName,
    Purpose: visitRow.Purpose,
    VisitDate: visitRow.VisitDate,
    CheckInTime: visitRow.CheckInTime || null,
    CheckOutTime: visitRow.CheckOutTime || null,
    Status: visitRow.Status,
    CreatedBy: visitRow.CreatedBy,
    CheckedOutBy: visitRow.CheckedOutBy || null,
    CreatedAt: visitRow.CreatedAt,
    UpdatedAt: visitRow.UpdatedAt,
    Company: {
      Id: visitRow.CompanyId,
      CompanyName: visitRow.CompanyName,
    },
    Visitors: visitors,
    SafetySummary: {
      totalVisitors: visitors.length,
      cleared,
      requiresInduction,
    },
  };
}

export async function createVisit(params: ICreateVisitParams, createdBy: number): Promise<IVisitDetail> {
  const { companyId, hostName, purpose, visitDate, visitorIds } = params;

  if (!Number.isInteger(companyId) || !hostName?.trim() || !purpose?.trim() || !visitDate || !Array.isArray(visitorIds) || !visitorIds.length) {
    throw new AppError('Missing required fields', 400);
  }

  const uniqueVisitorIds = [...new Set(visitorIds)];
  if (uniqueVisitorIds.length !== visitorIds.length) {
    throw new AppError('Duplicate visitor IDs in request', 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate) || Number.isNaN(Date.parse(`${visitDate}T00:00:00Z`))) {
    throw new AppError('Invalid visit date', 400);
  }

  const pool = await getDbConnection();

  const companyCheck = await pool
    .request()
    .input('id', sql.Int, companyId)
    .query('SELECT Id FROM Companies WHERE Id = @id AND IsActive = 1');

  if (companyCheck.recordset.length === 0) {
    throw new AppError('Company not found or inactive', 404);
  }

  const visitorCheck = await pool
    .request()
    .input('visitorIds', sql.NVarChar, uniqueVisitorIds.join(','))
    .input('companyId', sql.Int, companyId)
    .query(`
      SELECT Id FROM Visitors
      WHERE Id IN (SELECT value FROM STRING_SPLIT(@visitorIds, ','))
      AND CompanyId = @companyId
      AND IsActive = 1
    `);

  if (visitorCheck.recordset.length !== uniqueVisitorIds.length) {
    throw new AppError('One or more visitors not found, inactive, or do not belong to this company', 400);
  }

  const transaction = new sql.Transaction(pool);
  let transactionStarted = false;
  
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    transactionStarted = true;

    const clearance = await checkVisitorSafetyClearance(uniqueVisitorIds, companyId);
    const initialStatus = clearance.summary.requiresInduction > 0 ? 'PENDING_INDUCTION' : 'READY_FOR_CHECKIN';

    const visitCode = await generateVisitCode(transaction, visitDate);

    const visitResult = await transaction.request()
      .input('visitCode', sql.VarChar(20), visitCode)
      .input('companyId', sql.Int, companyId)
      .input('hostName', sql.NVarChar(100), hostName.trim())
      .input('purpose', sql.NVarChar(255), purpose.trim())
      .input('visitDate', sql.Date, visitDate)
      .input('status', sql.VarChar(20), initialStatus)
      .input('createdBy', sql.Int, createdBy)
      .query(`
        INSERT INTO Visits (VisitCode, CompanyId, HostName, Purpose, VisitDate, Status, CreatedBy)
        OUTPUT INSERTED.Id, INSERTED.VisitCode, INSERTED.CompanyId, INSERTED.HostName, 
               INSERTED.Purpose, INSERTED.VisitDate, INSERTED.CheckInTime, INSERTED.CheckOutTime,
               INSERTED.Status, INSERTED.CreatedBy, INSERTED.CheckedOutBy, INSERTED.CreatedAt, INSERTED.UpdatedAt
        VALUES (@visitCode, @companyId, @hostName, @purpose, @visitDate, @status, @createdBy)
      `);

    const visitId = visitResult.recordset[0].Id;

    for (const visitorId of uniqueVisitorIds) {
      await transaction.request()
        .input('visitId', sql.Int, visitId)
        .input('visitorId', sql.Int, visitorId)
        .query(`
          INSERT INTO VisitVisitors (VisitId, VisitorId)
          VALUES (@visitId, @visitorId)
        `);
    }

    await transaction.commit();

    const detail = await getVisitById(visitId);
    if (!detail) {
      throw new AppError('Visit created but not found', 500);
    }
    return detail;
  } catch (error) {
    if (transactionStarted) await transaction.rollback();
    throw error;
  }
}

export async function checkVisitorDuplicate(params: {
  visitorName: string;
  companyId: number;
  phoneNumber?: string;
}): Promise<{ strongDuplicate: boolean; potentialMatches: { Id: number; VisitorCode: string; VisitorName: string; CompanyName: string; PhoneNumber: string | null }[] }> {
  const pool = await getDbConnection();
  
  const normalizedName = params.visitorName.trim().replace(/\s+/g, ' ').toLowerCase();
  const normalizedPhone = params.phoneNumber ? params.phoneNumber.trim().replace(/[\s-]/g, '').toLowerCase() : null;

  if (normalizedPhone) {
    const strongDup = await pool
      .request()
      .input('companyId', sql.Int, params.companyId)
      .input('name', sql.NVarChar, normalizedName)
      .input('phone', sql.NVarChar, normalizedPhone)
      .query(`
        SELECT v.Id, v.VisitorCode, v.VisitorName, v.PhoneNumber, c.CompanyName
        FROM Visitors v
        INNER JOIN Companies c ON v.CompanyId = c.Id
        WHERE v.CompanyId = @companyId
          AND LOWER(LTRIM(RTRIM(v.VisitorName))) = @name
          AND LOWER(LTRIM(RTRIM(v.PhoneNumber))) = @phone
      `);

    if (strongDup.recordset.length > 0) {
      return {
        strongDuplicate: true,
        potentialMatches: strongDup.recordset.map(row => ({
          Id: row.Id,
          VisitorCode: row.VisitorCode,
          VisitorName: row.VisitorName,
          CompanyName: row.CompanyName,
          PhoneNumber: row.PhoneNumber || null,
        })),
      };
    }
  }

  const potentialMatches = await pool
    .request()
    .input('companyId', sql.Int, params.companyId)
    .input('name', sql.NVarChar, normalizedName)
    .query(`
      SELECT v.Id, v.VisitorCode, v.VisitorName, v.PhoneNumber, c.CompanyName
      FROM Visitors v
      INNER JOIN Companies c ON v.CompanyId = c.Id
      WHERE v.CompanyId = @companyId
        AND LOWER(LTRIM(RTRIM(v.VisitorName))) = @name
      ORDER BY v.CreatedAt DESC
    `);

  return {
    strongDuplicate: false,
    potentialMatches: potentialMatches.recordset.map(row => ({
      Id: row.Id,
      VisitorCode: row.VisitorCode,
      VisitorName: row.VisitorName,
      CompanyName: row.CompanyName,
      PhoneNumber: row.PhoneNumber || null,
    })),
  };
}

export async function safetyCheck(params: {
  companyId: number;
  visitorIds: number[];
}) {
  const check = await checkVisitorSafetyClearance(params.visitorIds, params.companyId);
  
  return {
    safetyInduction: check.safetyInduction,
    summary: check.summary,
    visitors: check.visitors,
  };
}

export async function checkInVisit(visitId: number): Promise<IVisitDetail> {
  const pool = await getDbConnection();

  const visitResult = await pool
    .request()
    .input('id', sql.Int, visitId)
    .query('SELECT Id, Status FROM Visits WHERE Id = @id');

  if (visitResult.recordset.length === 0) {
    throw new AppError('Visit not found', 404);
  }

  const visit = visitResult.recordset[0];
  if (visit.Status !== 'READY_FOR_CHECKIN') {
    throw new AppError('Visit is not ready for check-in. Current status: ' + visit.Status, 400);
  }

  await pool
    .request()
    .input('id', sql.Int, visitId)
    .query(`
      UPDATE Visits
      SET Status = 'IN',
          CheckInTime = SYSUTCDATETIME(),
          UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @id AND Status = 'READY_FOR_CHECKIN'
    `);

  const detail = await getVisitById(visitId);
  if (!detail) {
    throw new AppError('Visit not found after check-in', 500);
  }
  return detail;
}

export async function checkOutVisit(visitId: number, checkedOutBy: number): Promise<IVisitDetail> {
  const pool = await getDbConnection();

  const visitResult = await pool
    .request()
    .input('id', sql.Int, visitId)
    .query('SELECT Id, Status FROM Visits WHERE Id = @id');

  if (visitResult.recordset.length === 0) {
    throw new AppError('Visit not found', 404);
  }

  const visit = visitResult.recordset[0];
  if (visit.Status !== 'IN') {
    throw new AppError('Visit is not currently inside. Current status: ' + visit.Status, 400);
  }

  await pool
    .request()
    .input('id', sql.Int, visitId)
    .input('checkedOutBy', sql.Int, checkedOutBy)
    .query(`
      UPDATE Visits
      SET Status = 'OUT',
          CheckOutTime = SYSUTCDATETIME(),
          CheckedOutBy = @checkedOutBy,
          UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @id AND Status = 'IN'
    `);

  const detail = await getVisitById(visitId);
  if (!detail) {
    throw new AppError('Visit not found after check-out', 500);
  }
  return detail;
}

export async function getActiveVisits(params: {
  q?: string;
  companyId?: number;
  date?: string;
  page?: number;
  limit?: number;
}): Promise<IPaginatedVisits> {
  return listVisits({ ...params, status: 'IN' });
}

export async function getDashboardStats(): Promise<{
  visitorsToday: number;
  currentlyInside: number;
  checkedOutToday: number;
  inductionRequiredToday: number;
}> {
  const pool = await getDbConnection();

  const today = new Date().toISOString().split('T')[0];

  const visitorsTodayResult = await pool
    .request()
    .input('today', sql.Date, today)
    .query(`
      SELECT COUNT(DISTINCT vv.VisitorId) AS total
      FROM Visits v
      INNER JOIN VisitVisitors vv ON v.Id = vv.VisitId
      WHERE v.VisitDate = @today
    `);

  const currentlyInsideResult = await pool
    .request()
    .query(`
      SELECT COUNT(DISTINCT vv.VisitorId) AS total
      FROM Visits v
      INNER JOIN VisitVisitors vv ON v.Id = vv.VisitId
      WHERE v.Status = 'IN'
    `);

  const checkedOutTodayResult = await pool
    .request()
    .input('today', sql.Date, today)
    .query(`
      SELECT COUNT(*) AS total
      FROM Visits
      WHERE VisitDate = @today AND Status = 'OUT'
    `);

  const inductionRequiredResult = await pool
    .request()
    .input('today', sql.Date, today)
    .query(`
      SELECT COUNT(*) AS total
      FROM Visits
      WHERE VisitDate = @today AND Status = 'PENDING_INDUCTION'
    `);

  return {
    visitorsToday: visitorsTodayResult.recordset[0].total || 0,
    currentlyInside: currentlyInsideResult.recordset[0].total || 0,
    checkedOutToday: checkedOutTodayResult.recordset[0].total || 0,
    inductionRequiredToday: inductionRequiredResult.recordset[0].total || 0,
  };
}
