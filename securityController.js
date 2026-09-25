const { getActiveTravelsAll, getActiveIzinToday, getReturnedTravelsToday } = require('../models/securityModel');

const pad = (n) => String(n).padStart(2, '0');

function fmtTime(v) {
  if (v == null) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v).slice(0, 5);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

async function overviewHandler(req, res) {
  try {
    const [travel, izin, kembali] = await Promise.all([
      getActiveTravelsAll(),
      getActiveIzinToday(),
      getReturnedTravelsToday(),
    ]);
    res.json({
      travel: travel.map(mapTravel),
      izin: izin.map(mapIzin),
      kembali: kembali.map(mapKembali),
      counts: {
        travel: travel.length,
        izin: izin.length,
        keluar: travel.length + izin.length,
        kembali: kembali.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function mapTravel(r) {
  return {
    id: r.Id,
    nip: r.NIP,
    nama: r.Nama ? String(r.Nama).trim() : '-',
    tujuan: (r.Tujuan || '').trim(),
    keperluan: (r.Keperluan || '').trim(),
    tanggal: r.StartDate,
    jamKeluar: fmtTime(r.StartTime),
  };
}

function mapIzin(r) {
  return {
    id: r.Id,
    nip: r.NIP,
    nama: r.Nama ? String(r.Nama).trim() : '-',
    jenis: r.Jenis ? String(r.Jenis).trim() : (r.Description || '').trim(),
    keperluan: (r.Description || '').trim(),
    tanggal: r.ProposeStartDate,
    jamMulai: fmtTime(r.ProposeStartTime),
    jamSelesai: fmtTime(r.ProposeEndTime),
  };
}

function mapKembali(r) {
  return {
    id: r.Id,
    nip: r.NIP,
    nama: r.Nama ? String(r.Nama).trim() : '-',
    tujuan: (r.Tujuan || '').trim(),
    tanggal: r.EndDate,
    jamKembali: fmtTime(r.EndTime),
  };
}

module.exports = { overviewHandler };