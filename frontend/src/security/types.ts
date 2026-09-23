export interface Travel {
  id: number | string;
  nip: string;
  nama: string;
  tujuan: string;
  keperluan: string;
  jamKeluar: string | null;
  tanggal?: string;
  jamKembali?: string | null;
}

export interface Izin {
  id: number | string;
  nip: string;
  nama: string;
  jenis: string;
  keperluan: string;
  jamMulai: string | null;
  jamSelesai: string | null;
}

export interface Kembali {
  id: number | string;
  nip: string;
  nama: string;
  tujuan: string;
  jamKembali: string;
}

export interface OverviewCounts {
  travel: number;
  izin: number;
  kembali: number;
}

export interface Overview {
  counts: OverviewCounts;
  travel: Travel[];
  izin: Izin[];
  kembali: Kembali[];
}

export type ReportType = 'travel' | 'izin' | 'kembali';

export interface ReportRow {
  id: number | string;
  nip: string;
  nama: string;
  tanggal?: string;
  jamKeluar?: string | null;
  jamKembali?: string | null;
  tujuan?: string;
  keperluan?: string;
  jenis?: string;
  jamMulai?: string | null;
  jamSelesai?: string | null;
}

export interface ReportResponse {
  rows: ReportRow[];
}