import { useState, useEffect } from 'react';
import { fetchOverview, fetchReport } from '../api';
import { type Kembali, type ReportRow } from '../types';

export function SecurityKembaliPage() {
  const [items, setItems] = useState<Kembali[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'live' | 'report'>('live');

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
      setItems(data.kembali);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat data kembali');
    } finally {
      setLoading(false);
    }
  }

  async function loadReport() {
    setReportLoading(true);
    try {
      const data = await fetchReport('kembali', reportStart, reportEnd);
      setReportRows(data.rows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat laporan');
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <div className="companies-page space-y-6">
      <div className="page-header-compact">
        <div>
          <p className="page-eyebrow">Operasional Security</p>
          <h1>Sudah Kembali</h1>
          <p>Riwayat karyawan yang telah kembali ke area kantor.</p>
        </div>
        <div className="report-tabs">
          <button
            type="button"
            aria-selected={mode === 'live'}
            onClick={() => setMode('live')}
          >
            Kembali Hari Ini
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
          <div className="page-loading">Memuat data kepulangan...</div>
        ) : items.length === 0 ? (
          <div className="company-empty">
            <p>Belum ada karyawan yang tercatat kembali hari ini.</p>
          </div>
        ) : (
          <div className="companies-table-wrap">
            <table className="companies-table">
              <thead>
                <tr>
                  <th style={{ width: '35%' }}>Karyawan</th>
                  <th style={{ width: '40%' }}>Tujuan Awal</th>
                  <th style={{ width: '25%' }}>Jam Kembali</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong className="company-name">{item.nama}</strong>
                      <span className="text-xs text-gray-500 font-mono">NIP: {item.nip}</span>
                    </td>
                    <td>{item.tujuan}</td>
                    <td>
                      <span className="status-badge security-return-time">
                        {item.jamKembali}
                      </span>
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
              <p>Tidak ada data laporan kepulangan periode ini.</p>
            </div>
          ) : (
            <div className="companies-table-wrap">
              <table className="companies-table">
                <thead>
                  <tr>
                    <th style={{ width: '15%' }}>Tanggal</th>
                    <th style={{ width: '35%' }}>Karyawan</th>
                    <th style={{ width: '30%' }}>Tujuan</th>
                    <th style={{ width: '20%' }}>Jam Kembali</th>
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
                      <td className="font-mono text-xs">{row.jamKembali || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
