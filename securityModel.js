const { getConnection, sql } = require('../config/db');

async function getActiveTravelsAll() {
  const conn = await getConnection();
  const result = await conn.request().query(`
    SELECT t.Id, t.NIP, t.StartDate, t.StartTime, t.Tujuan, t.Keperluan,
           e.Name AS Nama
    FROM hris_Travel t
    LEFT JOIN hris_Employee e ON t.NIP = e.NIP
    WHERE t.[Status] = 'APPROVED' AND t.EndDate IS NULL AND t.IsActive = 1
    ORDER BY t.StartDate DESC, t.InpDate DESC
  `);
  return result.recordset;
}

async function getActiveIzinToday() {
  const conn = await getConnection();
  const result = await conn.request().query(`
    SELECT p.Id, p.NIP, p.PermitType, p.Description, p.ProposeStartDate, p.ProposeEndDate,
           p.ProposeStartTime, p.ProposeEndTime,
           e.Name AS Nama,
           sg.SubDetail AS Jenis
    FROM hris_Permit_Days p
    LEFT JOIN hris_Employee e ON p.NIP = e.NIP
    LEFT JOIN hris_Permit_SubGroup sg ON p.PermitType = sg.IdSubGroup
    WHERE p.IsActive = 1
      AND CONVERT(date, p.ProposeStartDate) = CONVERT(date, GETDATE())
      AND EXISTS (
        SELECT 1 FROM hris_Approval a
        WHERE a.Id = p.Id AND a.StatusId = 3
      )
      AND NOT EXISTS (
        SELECT 1 FROM hris_Permit_Days p2
        WHERE p2.Id = p.Id AND p2.IsOut = 1
      )
    ORDER BY p.ProposeStartDate DESC, p.ProposeStartTime ASC
  `);
  return result.recordset;
}

async function getReturnedTravelsToday() {
  const conn = await getConnection();
  const result = await conn.request().query(`
    SELECT t.Id, t.NIP, t.StartDate, t.StartTime, t.EndDate, t.EndTime, t.Tujuan,
           e.Name AS Nama
    FROM hris_Travel t
    LEFT JOIN hris_Employee e ON t.NIP = e.NIP
    WHERE t.EndDate IS NOT NULL
      AND CONVERT(date, t.EndDate) = CONVERT(date, GETDATE())
      AND t.IsActive = 1
    ORDER BY t.EndTime DESC
  `);
  return result.recordset;
}

module.exports = { getActiveTravelsAll, getActiveIzinToday, getReturnedTravelsToday };