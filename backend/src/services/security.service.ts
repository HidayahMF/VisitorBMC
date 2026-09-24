import { getDbConnection, sql } from '../config/database';

export type SecurityReportType = 'travel' | 'izin' | 'kembali';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatTime(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.slice(0, 5);
  if (value instanceof Date) return `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}`;
  return String(value).slice(0, 5);
}

function trim(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function field(row: Record<string, unknown>, name: string): unknown {
  return row[name] ?? row[name.toLowerCase()] ?? row[name.toUpperCase()];
}

function mapTravel(row: Record<string, unknown>) {
  const departed = Boolean(field(row, 'CheckpointId'));
  return {
    id: field(row, 'Id'),
    nip: trim(field(row, 'NIP')),
    nama: trim(field(row, 'Nama')) || '-',
    tujuan: trim(field(row, 'Tujuan')),
    keperluan: trim(field(row, 'Keperluan')),
    tanggal: field(row, 'StartDate'),
    jamKeluar: formatTime(field(row, 'StartTime')),
    jamKembali: formatTime(field(row, 'EndTime')),
    status: departed ? 'SEDANG_TUGAS_LUAR' : 'AKAN_TUGAS_LUAR',
    departureTime: formatTime(field(row, 'DepartureTime')),
  };
}

function mapIzin(row: Record<string, unknown>) {
  return {
    id: field(row, 'Id'),
    nip: trim(field(row, 'NIP')),
    nama: trim(field(row, 'Nama')) || '-',
    jenis: trim(field(row, 'Jenis')) || trim(field(row, 'Description')),
    keperluan: trim(field(row, 'Description')),
    tanggal: field(row, 'ProposeStartDate'),
    jamMulai: formatTime(field(row, 'ProposeStartTime')),
    jamSelesai: formatTime(field(row, 'ProposeEndTime')),
  };
}

function mapKembali(row: Record<string, unknown>) {
  return {
    id: field(row, 'Id'),
    nip: trim(field(row, 'NIP')),
    nama: trim(field(row, 'Nama')) || '-',
    tujuan: trim(field(row, 'Tujuan')),
    tanggal: field(row, 'EndDate'),
    jamKembali: formatTime(field(row, 'EndTime')),
  };
}

async function activeTravels() {
  const pool = await getDbConnection();
  const result = await pool.request().query(`
    SELECT t.Id, t.NIP, t.StartDate, t.StartTime, t.EndTime, t.Tujuan, t.Keperluan,
           cp.Id AS CheckpointId, cp.DepartureTime,
           e.Name AS Nama
    FROM hris_Travel t
    LEFT JOIN hris_Employee e ON t.NIP = e.NIP
    LEFT JOIN vms.SecurityTravelCheckpoints cp ON cp.TravelId = t.Id AND cp.ReturnedDate IS NULL
    WHERE t.[Status] = 'APPROVED' AND t.EndDate IS NULL AND t.IsActive = 1
    ORDER BY t.StartDate DESC, t.InpDate DESC
  `);
  return result.recordset.map(mapTravel);
}

async function activePermitsToday() {
  const pool = await getDbConnection();
  const result = await pool.request().query(`
    SELECT p.Id, p.NIP, p.Description, p.ProposeStartDate, p.ProposeEndDate,
           p.ProposeStartTime, p.ProposeEndTime, e.Name AS Nama, sg.SubDetail AS Jenis
    FROM hris_Permit_Days p
    LEFT JOIN hris_Employee e ON p.NIP = e.NIP
    LEFT JOIN hris_Permit_SubGroup sg ON p.PermitType = sg.IdSubGroup
    WHERE p.IsActive = 1
      AND CONVERT(date, p.ProposeStartDate) = CONVERT(date, GETDATE())
      AND EXISTS (SELECT 1 FROM hris_Approval a WHERE a.Id = p.Id AND a.StatusId = 3)
      AND NOT EXISTS (SELECT 1 FROM hris_Permit_Days p2 WHERE p2.Id = p.Id AND p2.IsOut = 1)
    ORDER BY p.ProposeStartDate DESC, p.ProposeStartTime ASC
  `);
  return result.recordset.map(mapIzin);
}

async function returnedToday() {
  const pool = await getDbConnection();
  const result = await pool.request().query(`
    SELECT t.Id, t.NIP, t.StartDate, t.StartTime, cp.ReturnedDate AS EndDate, cp.ReturnedTime AS EndTime, t.Tujuan,
           e.Name AS Nama
    FROM hris_Travel t
    LEFT JOIN hris_Employee e ON t.NIP = e.NIP
    INNER JOIN vms.SecurityTravelCheckpoints cp ON cp.TravelId = t.Id
      AND cp.ReturnedDate IS NOT NULL
      AND CONVERT(date, cp.ReturnedDate) = CONVERT(date, GETDATE())
      AND t.IsActive = 1
    ORDER BY t.EndTime DESC
  `);
  return result.recordset.map(mapKembali);
}

export async function getOverview() {
  const [travel, izin, kembali] = await Promise.all([activeTravels(), activePermitsToday(), returnedToday()]);
  const sedang = travel.filter((row) => row.status === 'SEDANG_TUGAS_LUAR');
  return { travel, izin, kembali, counts: { travel: sedang.length, akanTugasLuar: travel.length - sedang.length, izin: izin.length, keluar: sedang.length + izin.length, kembali: kembali.length } };
}

export async function markTravelDeparted(id: string, nip: string, departureTime: string, userId: number) {
  const pool = await getDbConnection();
  const request = pool.request()
    .input('id', sql.VarChar(50), id)
    .input('nip', sql.VarChar(50), nip.trim())
    .input('departureTime', sql.VarChar(5), departureTime)
    .input('userId', sql.Int, userId)
  const result = await request.query(`
      INSERT INTO vms.SecurityTravelCheckpoints (TravelId, NIP, DepartureTime, DepartedBy)
      SELECT Id, NIP, CONVERT(time, @departureTime), @userId
      FROM hris_Travel
      WHERE Id = @id AND (@nip = '' OR NIP = @nip)
        AND [Status] = 'APPROVED' AND EndDate IS NULL AND IsActive = 1
        AND NOT EXISTS (SELECT 1 FROM vms.SecurityTravelCheckpoints WHERE TravelId = hris_Travel.Id AND ReturnedDate IS NULL);
      SELECT @@ROWCOUNT AS Affected;
    `);
  return Number(result.recordset[0]?.Affected ?? 0) > 0;
}

export async function markTravelReturned(id: string | null, nip: string, returnTime: string, userId: number) {
  const pool = await getDbConnection();
  const result = await pool.request()
    .input('id', sql.VarChar(50), id)
    .input('nip', sql.VarChar(50), nip.trim())
    .input('returnTime', sql.VarChar(5), returnTime)
    .input('userId', sql.Int, userId)
    .query(`
      UPDATE cp
      SET ReturnedDate = CONVERT(date, GETDATE()), ReturnedTime = CONVERT(time, @returnTime),
          ReturnedBy = @userId, UpdatedAt = SYSUTCDATETIME()
      FROM vms.SecurityTravelCheckpoints cp
      WHERE cp.ReturnedDate IS NULL
        AND (@id IS NOT NULL AND cp.TravelId = @id OR @id IS NULL AND cp.NIP = @nip);
      SELECT @@ROWCOUNT AS Affected;
    `);
  return Number(result.recordset[0]?.Affected ?? 0) > 0;
}

export async function getReport(type: SecurityReportType, start: string, end: string) {
  const pool = await getDbConnection();
  const request = pool.request().input('start', sql.Date, start).input('end', sql.Date, end);
  if (type === 'travel') {
    const result = await request.query(`
      SELECT t.Id, t.NIP, t.StartDate AS Tanggal, t.StartTime AS JamKeluar, cp.DepartureTime,
             t.EndDate,
             t.EndTime AS JamKembali, t.Tujuan, t.Keperluan, e.Name AS Nama
      FROM hris_Travel t LEFT JOIN hris_Employee e ON t.NIP=e.NIP
      OUTER APPLY (SELECT TOP 1 DepartureTime FROM vms.SecurityTravelCheckpoints x WHERE x.TravelId=t.Id ORDER BY x.Id DESC) cp
      WHERE t.IsActive=1 AND CONVERT(date, t.StartDate) BETWEEN @start AND @end
      ORDER BY t.StartDate DESC, t.StartTime DESC
    `);
    return { rows: result.recordset.map((row) => ({ ...mapTravel(row), tanggal: row.Tanggal, jamKeluar: formatTime(row.JamKeluar), departureTime: formatTime(row.DepartureTime) })) };
  }
  if (type === 'izin') {
    const result = await request.query(`
      SELECT p.Id, p.NIP, p.ProposeStartDate AS Tanggal, p.Description, p.ProposeStartTime,
             p.ProposeEndTime, e.Name AS Nama, sg.SubDetail AS Jenis
      FROM hris_Permit_Days p LEFT JOIN hris_Employee e ON p.NIP=e.NIP
      LEFT JOIN hris_Permit_SubGroup sg ON p.PermitType=sg.IdSubGroup
      WHERE p.IsActive=1 AND CONVERT(date, p.ProposeStartDate) BETWEEN @start AND @end
      ORDER BY p.ProposeStartDate DESC, p.ProposeStartTime ASC
    `);
    return { rows: result.recordset.map((row) => ({ ...mapIzin(row), tanggal: row.Tanggal })) };
  }
  const result = await request.query(`
    SELECT t.Id, t.NIP, t.EndDate AS Tanggal, t.EndTime AS JamKembali, t.Tujuan, e.Name AS Nama
    FROM hris_Travel t LEFT JOIN hris_Employee e ON t.NIP=e.NIP
    WHERE t.IsActive=1 AND t.EndDate IS NOT NULL AND CONVERT(date, t.EndDate) BETWEEN @start AND @end
    ORDER BY t.EndDate DESC, t.EndTime DESC
  `);
  return { rows: result.recordset.map((row) => ({ ...mapKembali(row), tanggal: row.Tanggal })) };
}
