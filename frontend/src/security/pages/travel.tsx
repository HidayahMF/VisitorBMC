import { useState, useEffect } from 'react';
import { fetchOverview, returnTravel, fetchReport } from '../api';
import { type Travel, type ReportRow } from '../types';

export function SecurityTravelPage() {
  const [items, setItems] = useState<Travel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<{ id: number | string; nip: string; nama: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'live' | 'report'>('live');

  // Report state
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [reportStart, setReportStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportEnd, setReportEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (mode === 'live') {
      void load();
    } else {
      void loadReport();
    }
  }, [mode]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchOverview();
      setItems(data.travel);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat tugas luar');
    } finally {
      setLoading(false);
    }
  }

  async function loadReport() {
    setReportLoading(true);
    try {
      const data = await fetchReport('travel', reportStart, reportEnd);
      setReportRows(data.rows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat laporan');
    } finally {
      setReportLoading(false);
    }
  }

  async function handleReturn() {
    if (!confirmId) return;
    setSubmitting(true);
    try {
      await returnTravel(confirmId.id, confirmId.nip);
      setConfirmId(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal mencatat kembali');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="companies-page space-y-6">
      <div className="page-header-compact">
        <div>
          <p className="page-eyebrow">Operasional Security</p>
          <h1>Tugas Luar (Dinas)</h1>
          <p>Karyawan yang sedang berada di luar area kantor.</p>
        </div>
        <div className="report-tabs">
          <button
            type="button"
            aria-selected={mode === 'live'}
            onClick={() => setMode('live')}
          >
            Aktif Hari Ini
          </button>
          <button
            type="button"
            aria-selected={mode === 'report'}
            onClick={() => setMode('report')}
          >
            Laporan Riwayat
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

      {mode === 'live' ? (
        loading ? (
          <div className="page-loading">Memuat data tugas luar...</div>
        ) : items.length === 0 ? (
          <div className="company-empty">
            <p>Tidak ada karyawan yang sedang tugas luar saat ini.</p>
          </div>
        ) : (
          <div className="companies-table-wrap">
            <table className="companies-table">
              <thead>
                <tr>
                  <th style={{ width: '35%' }}>Karyawan</th>
                  <th style={{ width: '35%' }}>Tujuan & Keperluan</th>
                  <th style={{ width: '15%' }}>Jam Keluar</th>
                  <th className="text-right" style={{ width: '15%' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong className="company-name">{item.nama}</strong>
                      <span className="text-xs text-gray-500 font-mono">NIP: {item.nip}</span>
                    </td>
                    <td>
                      <div className="table-primary-text">{item.tujuan}</div>
                      <div className="text-xs text-gray-500">{item.keperluan}</div>
                    </td>
                    <td>
                      <span className="status-badge security-travel-time">
                        {item.jamKeluar || '-'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => setConfirmId({ id: item.id, nip: item.nip, nama: item.nama })}
                        className="primary-button !min-h-[32px] !py-1 !text-xs !bg-emerald-600 !border-emerald-600 hover:!bg-emerald-700"
                      >
                        Catat Kembali
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="report-filters bg-white p-4 border rounded">
            <div>
              <label>Mulai</label>
              <input
                type="date"
                value={reportStart}
                onChange={(e) => setReportStart(e.target.value)}
              />
            </div>
            <div>
              <label>Sampai</label>
              <input
                type="date"
                value={reportEnd}
                onChange={(e) => setReportEnd(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={loadReport}
              disabled={reportLoading}
              className="primary-button"
            >
              {reportLoading ? 'Memuat...' : 'Tampilkan'}
            </button>
          </div>

          {reportLoading ? (
            <div className="page-loading">Memuat laporan...</div>
          ) : reportRows.length === 0 ? (
            <div className="company-empty">
              <p>Tidak ada data laporan untuk rentang tanggal ini.</p>
            </div>
          ) : (
            <div className="companies-table-wrap">
              <table className="companies-table">
                <thead>
                  <tr>
                    <th style={{ width: '15%' }}>Tanggal</th>
                    <th style={{ width: '30%' }}>Karyawan</th>
                    <th style={{ width: '25%' }}>Tujuan</th>
                    <th style={{ width: '15%' }}>Keluar</th>
                    <th style={{ width: '15%' }}>Kembali</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((row) => (
                    <tr key={row.id}>
                      <td className="font-mono text-xs">{row.tanggal || '-'}</td>
                      <td>
                        <strong className="company-name">{row.nama}</strong>
                        <span className="text-xs text-gray-500 font-mono">NIP: {row.nip}</span>
                      </td>
                      <td>{row.tujuan || '-'}</td>
                      <td className="font-mono text-xs">{row.jamKeluar || '-'}</td>
                      <td className="font-mono text-xs">{row.jamKembali || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {confirmId && (
        <div className="content-preview-backdrop">
          <div className="bg-white rounded p-6 max-w-sm w-full space-y-4 shadow-xl border">
            <h3 className="font-bold text-base text-ink">Konfirmasi Kepulangan</h3>
            <p className="text-sm text-gray-600">
              Konfirmasi kepulangan untuk <strong>{confirmId.nama}</strong> ({confirmId.nip})?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmId(null)}
                className="secondary-button"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleReturn}
                className="primary-button !bg-emerald-600 !border-emerald-600 hover:!bg-emerald-700"
              >
                {submitting ? 'Menyimpan...' : 'Ya, Catat Kembali'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
