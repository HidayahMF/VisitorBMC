import type { Overview, OverviewCounts, ReportRow, ReportType } from './types';

const DUMMY_USER = { username: 'security', password: 'sec2026' };

export function isMock(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('mock');
}

export function mockLoginUsername(): string {
  return DUMMY_USER.username;
}

export function mockLoginPassword(): string {
  return DUMMY_USER.password;
}

function hhmm(offsetMin: number): string {
  const d = new Date(Date.now() - offsetMin * 60000);
  return d.toTimeString().slice(0, 8);
}

const NOW_SLOT = hhmm(0);
const EARLY_SLOT = hhmm(25);
const NOON_SLOT = hhmm(140);

export function getMockOverview(): Overview {
  const travel = [
    { id: 201, nip: '1021', nama: 'Andi Saputra', tujuan: 'PT Supplier Timur', keperluan: 'Pengambilan material produksi', jamKeluar: EARLY_SLOT },
    { id: 202, nip: '1044', nama: 'Budi Hartono', tujuan: 'Kantor Cabang Surabaya', keperluan: 'Meeting proyek', jamKeluar: NOW_SLOT },
    { id: 203, nip: '1090', nama: 'Citra Dewi', tujuan: 'Bank Mandiri', keperluan: 'Pengurusan keuangan', jamKeluar: NOON_SLOT },
  ] as const;

  const izin = [
    { id: 301, nip: '1112', nama: 'Dedi Pratama', jenis: 'Izin Khusus', keperluan: 'Urusan keluarga', jamMulai: EARLY_SLOT, jamSelesai: null },
    { id: 302, nip: '1135', nama: 'Eka Lestari', jenis: 'Izin Sehari', keperluan: 'Sakit', jamMulai: null, jamSelesai: null },
  ] as const;

  const kembali = [
    { id: 401, nip: '1201', nama: 'Fajar Nugroho', tujuan: 'PT Mitra Sejahtera', jamKembali: hhmm(50) },
    { id: 402, nip: '1209', nama: 'Gita Ayu', tujuan: 'Kejaksaan', jamKembali: hhmm(95) },
  ] as const;

  const counts: OverviewCounts = {
    travel: travel.length,
    izin: izin.length,
    kembali: kembali.length,
  };

  return { counts, travel: [...travel], izin: [...izin], kembali: [...kembali] };
}

function isoDays(start: string, end: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime()) || last < cursor) return [start || end];
  while (cursor <= last) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function mockReportRows(type: ReportType, start: string, end: string): ReportRow[] {
  const days = isoDays(start, end);
  const sample = getMockOverview();
  const base = days.length ? days[0] : start;

  if (type === 'travel') {
    return sample.travel.map((row, i) => ({
      id: row.id,
      nip: row.nip,
      nama: row.nama,
      tujuan: row.tujuan,
      keperluan: row.keperluan,
      tanggal: base,
      jamKeluar: row.jamKeluar,
      jamKembali: days.length > i + 1 ? hhmm(10 + i) : null,
    }));
  }
  if (type === 'izin') {
    return sample.izin.map((row, i) => ({
      id: row.id,
      nip: row.nip,
      nama: row.nama,
      jenis: row.jenis,
      keperluan: row.keperluan,
      tanggal: base,
      jamMulai: row.jamMulai,
      jamSelesai: row.jamSelesai,
    }));
  }
  return sample.kembali.map((row, i) => ({
    id: row.id,
    nip: row.nip,
    nama: row.nama,
    tujuan: row.tujuan,
    tanggal: base,
    jamKembali: row.jamKembali,
  }));
}