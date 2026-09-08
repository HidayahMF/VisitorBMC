import { getDbConnection, sql } from '../config/database';

export interface ReportFilters { from?: string; to?: string; companyId?: number; host?: string; status?: string; page?: number; limit?: number; }
const paging = (filters: ReportFilters) => ({ page: Math.max(1, filters.page ?? 1), limit: Math.min(100, Math.max(1, filters.limit ?? 50)) });

export async function visitReport(filters: ReportFilters) {
  const { page, limit } = paging(filters); const request = (await getDbConnection()).request(); const where: string[] = [];
  if (filters.from) { where.push('v.VisitDate >= @from'); request.input('from', sql.Date, filters.from); }
  if (filters.to) { where.push('v.VisitDate <= @to'); request.input('to', sql.Date, filters.to); }
  if (filters.companyId !== undefined) { where.push('v.CompanyId = @companyId'); request.input('companyId', sql.Int, filters.companyId); }
  if (filters.host) { where.push('v.HostName LIKE @host'); request.input('host', sql.NVarChar(100), `%${filters.host}%`); }
  if (filters.status) { where.push('v.Status = @status'); request.input('status', sql.VarChar(20), filters.status); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''; const offset = (page - 1) * limit;
  request.input('offset', sql.Int, offset).input('limit', sql.Int, limit);
  const result = await request.query(`SELECT v.VisitCode, v.VisitDate, vis.VisitorName, c.CompanyName, v.HostName, v.CheckInTime, v.CheckOutTime, v.Status, COUNT(*) OVER() AS TotalCount FROM vms.Visits v INNER JOIN vms.Companies c ON c.Id=v.CompanyId INNER JOIN vms.VisitVisitors vv ON vv.VisitId=v.Id INNER JOIN vms.Visitors vis ON vis.Id=vv.VisitorId ${clause} ORDER BY v.VisitDate DESC, v.Id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
  const total = Number(result.recordset[0]?.TotalCount ?? 0); return { data: result.recordset.map(({ TotalCount: _total, ...row }) => row), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function visitorReport(filters: ReportFilters) {
  const { page, limit } = paging(filters); const request = (await getDbConnection()).request(); const where: string[] = [];
  if (filters.companyId !== undefined) { where.push('v.CompanyId=@companyId'); request.input('companyId', sql.Int, filters.companyId); }
  if (filters.status) { where.push('v.IsActive=@active'); request.input('active', sql.Bit, filters.status === 'ACTIVE' ? 1 : 0); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''; const offset = (page - 1) * limit;
  request.input('offset', sql.Int, offset).input('limit', sql.Int, limit);
  const result = await request.query(`SELECT v.VisitorName, c.CompanyName, COUNT(vv.VisitId) AS VisitsCount, MAX(vis.VisitDate) AS LatestVisit, CASE WHEN v.IsActive=1 THEN 'ACTIVE' ELSE 'INACTIVE' END AS Status, COUNT(*) OVER() AS TotalCount FROM vms.Visitors v INNER JOIN vms.Companies c ON c.Id=v.CompanyId LEFT JOIN vms.VisitVisitors vv ON vv.VisitorId=v.Id LEFT JOIN vms.Visits vis ON vis.Id=vv.VisitId ${clause} GROUP BY v.VisitorName,c.CompanyName,v.IsActive ORDER BY v.VisitorName OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
  const total = Number(result.recordset[0]?.TotalCount ?? 0); return { data: result.recordset.map(({ TotalCount: _total, ...row }) => row), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function inductionReport(filters: ReportFilters) {
  const { page, limit } = paging(filters); const request = (await getDbConnection()).request(); const where: string[] = [];
  if (filters.from) { where.push('r.CompletedAt >= @from'); request.input('from', sql.DateTime2, filters.from); }
  if (filters.to) { where.push('r.CompletedAt < DATEADD(day, 1, @to)'); request.input('to', sql.DateTime2, filters.to); }
  if (filters.companyId !== undefined) { where.push('v.CompanyId = @companyId'); request.input('companyId', sql.Int, filters.companyId); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''; const offset = (page - 1) * limit;
  request.input('offset', sql.Int, offset).input('limit', sql.Int, limit);
  const result = await request.query(`SELECT v.VisitorName, c.CompanyName, r.InductionVersion, r.CompletedAt, r.ValidUntil, CASE WHEN r.ValidUntil > SYSUTCDATETIME() THEN 'VALID' ELSE 'EXPIRED' END AS Status, COUNT(*) OVER() AS TotalCount FROM vms.VisitorInductionRecords r INNER JOIN vms.Visitors v ON v.Id=r.VisitorId INNER JOIN vms.Companies c ON c.Id=v.CompanyId ${clause} ORDER BY r.CompletedAt DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
  const total = Number(result.recordset[0]?.TotalCount ?? 0); return { data: result.recordset.map(({ TotalCount: _total, ...row }) => row), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
