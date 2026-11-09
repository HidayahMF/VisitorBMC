import { getDbConnection, sql } from '../config/database';

export type SecurityReportType = 'travel' | 'izin' | 'kembali';
export type ScanAction = 'DEPARTED';

export function scanAction(): ScanAction {
  return 'DEPARTED';
}

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

export function mapTravel(row: Record<string, unknown>) {
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
    jenisTugas: 'MANDIRI',
  };
}

export function mapGroupTravelRows(rows: Record<string, unknown>[], includeReturned = false) {
  const latestVersions = new Map<string, number>();
  for (const row of rows) {
    const groupCode = trim(field(row, 'GroupCode'));
    const versionNo = Number(field(row, 'VersionNo'));
    if (groupCode && Number.isFinite(versionNo)) latestVersions.set(groupCode, Math.max(latestVersions.get(groupCode) ?? 0, versionNo));
  }

  const groups = new Map<string, {
    id: string;
    groupCode: string;
    nip: string;
    nama: string;
    members: { nip: string; nama: string }[];
    tujuan: string;
    keperluan: string;
    tanggal: unknown;
    jamKeluar: string | null;
    jamKembali: string | null;
    kendaraan: string;
    platNomor: string;
    pengemudi: string;
    qrToken: string;
    status: 'AKAN_TUGAS_LUAR' | 'SEDANG_TUGAS_LUAR';
    groupStatus: string;
    departureTime: string | null;
    canDepart: boolean;
    jenisTugas: 'GROUP';
  }>();

  for (const row of rows) {
    const groupCode = trim(field(row, 'GroupCode'));
    const memberNip = trim(field(row, 'MemberNIP'));
    const memberStatus = trim(field(row, 'MemberStatus'));
    if (!groupCode || !memberNip || memberStatus !== 'ACTIVE' || (!includeReturned && field(row, 'ReturnedDate') != null)) continue;

    const versionNo = Number(field(row, 'VersionNo'));
    if (latestVersions.get(groupCode) !== versionNo) continue;
    const current = groups.get(groupCode);

    const member = { nip: memberNip, nama: trim(field(row, 'MemberName')) || '-' };
    if (current) {
      if (!current.members.some((item) => item.nip === member.nip)) current.members.push(member);
      current.nip = current.members.map((item) => item.nip).join(', ');
      current.nama = current.members.map((item) => item.nama).join(', ');
      continue;
    }

    const departed = Boolean(field(row, 'DepartureAt') || field(row, 'GroupCheckpointDepartureTime'));
    groups.set(groupCode, {
      id: groupCode,
      groupCode,
      nip: member.nip,
      nama: member.nama,
      members: [member],
      tujuan: trim(field(row, 'Tujuan')),
      keperluan: trim(field(row, 'Tugas')),
      tanggal: field(row, 'ExitDate'),
      jamKeluar: formatTime(field(row, 'ExitTime')),
      jamKembali: null,
      kendaraan: trim(field(row, 'VehicleType')),
      platNomor: trim(field(row, 'VehiclePlate')),
      pengemudi: trim(field(row, 'DriverNIP')) || trim(field(row, 'DriverName')),
      qrToken: trim(field(row, 'QrToken')),
      status: departed ? 'SEDANG_TUGAS_LUAR' : 'AKAN_TUGAS_LUAR',
      groupStatus: trim(field(row, 'GroupStatus')) || trim(field(row, 'VersionStatus')),
      departureTime: formatTime(field(row, 'GroupCheckpointDepartureTime') ?? field(row, 'DepartureAt')),
      canDepart: Number(field(row, 'VehicleApprovalStatus')) === 3,
      jenisTugas: 'GROUP',
    });
  }

  return [...groups.values()];
}

export function groupTravelReportDate(row: Record<string, unknown>) {
  return field(row, 'ReturnedDate');
}

export function mapGroupTravelReportRows(rows: Record<string, unknown>[]) {
  return mapGroupTravelRows(rows, true).map((row) => ({
    ...row,
    tanggal: rows.find((item) => trim(field(item, 'GroupCode')) === row.groupCode)?.['ExitDate'],
    jamKeluar: row.jamKeluar,
    jamKembali: formatTime(rows.find((item) => trim(field(item, 'GroupCode')) === row.groupCode)?.['ReturnedTime']),
  }));
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
           COALESCE(cp.Id, 0) AS CheckpointId, cp.DepartureTime AS DepartureTime,
           e.Name AS Nama
    FROM hris_Travel t
    LEFT JOIN hris_Employee e ON t.NIP = e.NIP
    LEFT JOIN vms.SecurityTravelCheckpoints cp ON cp.TravelId = t.Id AND cp.ReturnedDate IS NULL
    WHERE t.[Status] = 'APPROVED' AND t.EndDate IS NULL AND t.IsActive = 1
      AND CONVERT(date, t.StartDate) = CONVERT(date, GETDATE())
    ORDER BY t.StartDate DESC, t.InpDate DESC
  `);
  const groupResult = await pool.request().query(`
    WITH LatestVersion AS (
      SELECT v.*, ROW_NUMBER() OVER (PARTITION BY v.GroupCode ORDER BY v.VersionNo DESC) AS rn
      FROM hris_Travel_Group_Version v
    )
    SELECT g.GroupCode, g.Status AS GroupStatus, v.VersionNo, v.ExitDate, v.ExitTime,
           v.Tujuan, v.Tugas, v.VehicleType, v.VehiclePlate, v.Status AS VersionStatus,
           v.QrToken, v.DepartureAt, cp.DepartureTime AS GroupCheckpointDepartureTime, cp.ReturnedDate,
           v.DriverNIP, v.DriverName,
           m.NIP AS MemberNIP, e.Name AS MemberName, m.Status AS MemberStatus,
           v.VersionNo AS CurrentVersionNo,
           COALESCE((SELECT MAX(a.StatusId) FROM hris_Travel_Group_Approval a WHERE a.GroupCode = v.GroupCode AND a.VersionNo = v.VersionNo AND UPPER(a.ApprovalType) IN ('VEHICLE', 'KENDARAAN')), 0) AS VehicleApprovalStatus
    FROM hris_Travel_Group g
    INNER JOIN LatestVersion v ON v.GroupCode = g.GroupCode AND v.rn = 1
    INNER JOIN hris_Travel_Group_Member m ON m.GroupCode = v.GroupCode AND m.VersionNo = v.VersionNo AND m.Status = 'ACTIVE'
    LEFT JOIN hris_Employee e ON e.NIP = m.NIP
    OUTER APPLY (SELECT TOP 1 c.DepartureTime AS DepartureTime, c.ReturnedDate FROM vms.SecurityTravelCheckpoints c WHERE c.TravelId = g.GroupCode ORDER BY c.Id DESC) cp
    WHERE g.Status NOT IN ('CANCELLED', 'COMPLETED') AND v.Status NOT IN ('CANCELLED', 'COMPLETED')
      AND cp.ReturnedDate IS NULL
      AND CONVERT(date, v.ExitDate) = CONVERT(date, GETDATE())
    ORDER BY v.ExitDate DESC, v.ExitTime ASC, g.GroupCode, m.NIP
  `);
  return [...result.recordset.map(mapTravel), ...mapGroupTravelRows(groupResult.recordset)];
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
      WHERE cp.ReturnedDate IS NOT NULL
      AND CONVERT(date, cp.ReturnedDate) = CONVERT(date, GETDATE())
      AND t.IsActive = 1
    ORDER BY cp.ReturnedTime DESC
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
    .input('userId', sql.Int, userId);
  const result = await request.query(`
    IF EXISTS (
      SELECT 1
      FROM hris_Travel_Group g
      INNER JOIN hris_Travel_Group_Version v ON v.GroupCode = g.GroupCode
      WHERE g.GroupCode = @id
        AND NOT EXISTS (SELECT 1 FROM hris_Travel_Group_Version newer WHERE newer.GroupCode = v.GroupCode AND newer.VersionNo > v.VersionNo)
    )
    BEGIN
      UPDATE v
      SET DepartureAt = CONVERT(datetime2, CONVERT(varchar(10), GETDATE(), 120) + ' ' + @departureTime),
          Status = CASE WHEN v.Status = 'APPROVED' THEN 'DEPARTED' ELSE v.Status END
      FROM hris_Travel_Group_Version v
      INNER JOIN hris_Travel_Group g ON g.GroupCode = v.GroupCode
      WHERE v.GroupCode = @id
        AND NOT EXISTS (SELECT 1 FROM hris_Travel_Group_Version newer WHERE newer.GroupCode = v.GroupCode AND newer.VersionNo > v.VersionNo)
        AND g.Status NOT IN ('CANCELLED', 'COMPLETED')
        AND v.Status NOT IN ('CANCELLED', 'COMPLETED')
        AND v.DepartureAt IS NULL
        AND EXISTS (
          SELECT 1 FROM hris_Travel_Group_Approval a
          WHERE a.GroupCode = v.GroupCode AND a.VersionNo = v.VersionNo
            AND UPPER(a.ApprovalType) IN ('VEHICLE', 'KENDARAAN') AND a.StatusId = 3
        );
      INSERT INTO vms.SecurityTravelCheckpoints (TravelId, NIP, DepartureTime, DepartedBy)
      SELECT @id, '', CONVERT(time, @departureTime), @userId
      WHERE EXISTS (
        SELECT 1 FROM hris_Travel_Group_Version v
        WHERE v.GroupCode = @id AND v.DepartureAt IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM hris_Travel_Group_Version newer WHERE newer.GroupCode = v.GroupCode AND newer.VersionNo > v.VersionNo)
      )
      AND NOT EXISTS (SELECT 1 FROM vms.SecurityTravelCheckpoints WHERE TravelId = @id AND ReturnedDate IS NULL);
      SELECT @@ROWCOUNT AS Affected;
    END
    ELSE
    BEGIN
      INSERT INTO vms.SecurityTravelCheckpoints (TravelId, NIP, DepartureTime, DepartedBy)
      SELECT Id, NIP, CONVERT(time, @departureTime), @userId
      FROM hris_Travel
      WHERE Id = @id AND (@nip = '' OR NIP = @nip)
        AND [Status] = 'APPROVED' AND EndDate IS NULL AND IsActive = 1
        AND NOT EXISTS (SELECT 1 FROM vms.SecurityTravelCheckpoints WHERE TravelId = hris_Travel.Id AND ReturnedDate IS NULL);
      SELECT @@ROWCOUNT AS Affected;
    END
  `);
  return Number(result.recordset[0]?.Affected ?? 0) > 0;
}

export async function getActiveTravelCheckpoint(id: string) {
  const pool = await getDbConnection();
  const result = await pool.request()
    .input('id', sql.VarChar(50), id)
    .query(`
      SELECT TOP 1 TravelId, NIP
      FROM vms.SecurityTravelCheckpoints
      WHERE TravelId = @id AND ReturnedDate IS NULL
      ORDER BY Id DESC;
    `);
  return result.recordset[0] as { TravelId: string; NIP: string } | undefined;
}

export async function markTravelReturned(id: string | null, nip: string, returnTime: string, userId: number) {
  const pool = await getDbConnection();
  const result = await pool.request()
    .input('id', sql.VarChar(50), id)
    .input('nip', sql.VarChar(50), nip.trim())
    .input('returnTime', sql.VarChar(5), returnTime)
    .input('userId', sql.Int, userId)
    .query(`
      DECLARE @affected INT = 0;
      IF EXISTS (SELECT 1 FROM hris_Travel_Group WHERE GroupCode = @id)
      BEGIN
        UPDATE cp
        SET ReturnedDate = CONVERT(date, GETDATE()), ReturnedTime = CONVERT(time, @returnTime),
            ReturnedBy = @userId, UpdatedAt = SYSUTCDATETIME()
        FROM vms.SecurityTravelCheckpoints cp
        WHERE cp.TravelId = @id AND cp.ReturnedDate IS NULL;
        SET @affected = @@ROWCOUNT;

        IF @affected = 0
        BEGIN
          INSERT INTO vms.SecurityTravelCheckpoints
            (TravelId, NIP, DepartureDate, DepartureTime, ReturnedDate, ReturnedTime, DepartedBy, ReturnedBy, UpdatedAt)
          SELECT TOP 1 v.GroupCode, '', CONVERT(date, v.DepartureAt), CONVERT(time, v.DepartureAt),
                 CONVERT(date, GETDATE()), CONVERT(time, @returnTime), @userId, @userId, SYSUTCDATETIME()
          FROM hris_Travel_Group_Version v
          WHERE v.GroupCode = @id AND v.DepartureAt IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM hris_Travel_Group_Version newer WHERE newer.GroupCode = v.GroupCode AND newer.VersionNo > v.VersionNo)
            AND NOT EXISTS (SELECT 1 FROM vms.SecurityTravelCheckpoints cp WHERE cp.TravelId = v.GroupCode)
            AND EXISTS (
              SELECT 1 FROM hris_Travel_Group_Approval a
              WHERE a.GroupCode = v.GroupCode AND a.VersionNo = v.VersionNo
                AND UPPER(a.ApprovalType) IN ('VEHICLE', 'KENDARAAN') AND a.StatusId = 3
            )
          ORDER BY v.VersionNo DESC;
          SET @affected = @@ROWCOUNT;
        END
      END
      ELSE
      BEGIN
        UPDATE cp
        SET ReturnedDate = CONVERT(date, GETDATE()), ReturnedTime = CONVERT(time, @returnTime),
            ReturnedBy = @userId, UpdatedAt = SYSUTCDATETIME()
        FROM vms.SecurityTravelCheckpoints cp
        WHERE cp.ReturnedDate IS NULL
          AND (@id IS NOT NULL AND cp.TravelId = @id OR @id IS NULL AND cp.NIP = @nip);
        SET @affected = @@ROWCOUNT;
      END
      SELECT @affected AS Affected;
    `);
  return Number(result.recordset[0]?.Affected ?? 0) > 0;
}

export async function getReport(type: SecurityReportType, start: string, end: string) {
  const pool = await getDbConnection();
  const request = pool.request().input('start', sql.Date, start).input('end', sql.Date, end);
  if (type === 'travel') {
    const result = await request.query(`
      SELECT t.Id, t.NIP, t.StartDate AS Tanggal, t.StartTime AS JamKeluar, cp.DepartureTime AS DepartureTime,
             t.EndDate,
             t.EndTime AS JamKembali, t.Tujuan, t.Keperluan, e.Name AS Nama
      FROM hris_Travel t LEFT JOIN hris_Employee e ON t.NIP=e.NIP
      OUTER APPLY (SELECT TOP 1 DepartureTime FROM vms.SecurityTravelCheckpoints x WHERE x.TravelId=t.Id ORDER BY x.Id DESC) cp
      WHERE t.IsActive=1 AND CONVERT(date, t.StartDate) BETWEEN @start AND @end
      ORDER BY t.StartDate DESC, t.StartTime DESC
    `);
    const groupResult = await request.query(`
      WITH LatestVersion AS (
        SELECT v.*, ROW_NUMBER() OVER (PARTITION BY v.GroupCode ORDER BY v.VersionNo DESC) AS rn
        FROM hris_Travel_Group_Version v
      )
      SELECT g.GroupCode, g.Status AS GroupStatus, v.VersionNo, v.ExitDate, v.ExitTime,
             v.Tujuan, v.Tugas, v.VehicleType, v.VehiclePlate, v.Status AS VersionStatus,
             v.QrToken, v.DepartureAt, cp.DepartureTime AS GroupCheckpointDepartureTime,
             cp.ReturnedDate, cp.ReturnedTime, v.DriverNIP, v.DriverName,
             m.NIP AS MemberNIP, e.Name AS MemberName, m.Status AS MemberStatus,
             COALESCE((SELECT MAX(a.StatusId) FROM hris_Travel_Group_Approval a
               WHERE a.GroupCode = v.GroupCode AND a.VersionNo = v.VersionNo
                 AND UPPER(a.ApprovalType) IN ('VEHICLE', 'KENDARAAN')), 0) AS VehicleApprovalStatus
      FROM hris_Travel_Group g
      INNER JOIN LatestVersion v ON v.GroupCode = g.GroupCode AND v.rn = 1
      INNER JOIN hris_Travel_Group_Member m ON m.GroupCode = v.GroupCode AND m.VersionNo = v.VersionNo
        AND m.Status = 'ACTIVE'
      LEFT JOIN hris_Employee e ON e.NIP = m.NIP
      OUTER APPLY (SELECT TOP 1 c.DepartureTime, c.ReturnedDate, c.ReturnedTime
        FROM vms.SecurityTravelCheckpoints c
        WHERE c.TravelId = g.GroupCode ORDER BY c.Id DESC) cp
      WHERE g.Status <> 'CANCELLED' AND v.Status <> 'CANCELLED'
        AND cp.ReturnedDate IS NOT NULL
        AND CONVERT(date, cp.ReturnedDate) BETWEEN @start AND @end
      ORDER BY cp.ReturnedDate DESC, cp.ReturnedTime DESC, g.GroupCode, m.NIP
    `);
    return {
      rows: [
        ...result.recordset.map((row) => ({ ...mapTravel(row), tanggal: row.Tanggal, jamKeluar: formatTime(row.JamKeluar), departureTime: formatTime(row.DepartureTime) })),
        ...mapGroupTravelReportRows(groupResult.recordset),
      ],
    };
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
