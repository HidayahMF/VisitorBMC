import { useState, useEffect } from 'react';
import { fetchOverview, fetchReport } from '../api';
import { type Izin, type ReportRow } from '../types';

export function SecurityIzinPage() {
  const [items, setItems] = useState<Izin[]>([]);
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
      setItems(data.izin);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat daftar izin');
    } finally {
      setLoading(false);
    }
  }

  async function loadReport() {
    setReportLoading(true);
    try {
      const data = await fetchReport('izin', reportStart, reportEnd);
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
          <h1>Izin Karyawan</h1>
          <p>Daftar karyawan yang terdaftar izin hari ini.</p>
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
          <div className="page-loading">Memuat data izin...</div>
        ) : items.length === 0 ? (
          <div className="company-empty">
            <p>Tidak ada izin aktif kategori ini hari ini.</p>
          </div>
        ) : (
          <div className="companies-table-wrap">
            <table className="companies-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Karyawan</th>
                  <th style={{ width: '20%' }}>Jenis</th>
                  <th style={{ width: '30%' }}>Keperluan</th>
                  <th style={{ width: '20%' }}>Waktu Izin</th>
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
                      <span className="status-badge security-permit-type">
                        {item.jenis}
                      </span>
                    </td>
                    <td className="text-gray-700">{item.keperluan}</td>
                    <td className="font-mono text-xs">
                      {item.jamMulai ? `${item.jamMulai} - ${item.jamSelesai || '...'}` : 'Sehari Penuh'}
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
              <p>Tidak ada data laporan izin periode ini.</p>
            </div>
          ) : (
            <div className="companies-table-wrap">
              <table className="companies-table">
                <thead>
                  <tr>
                    <th style={{ width: '12%' }}>Tanggal</th>
                    <th style={{ width: '28%' }}>Karyawan</th>
                    <th style={{ width: '15%' }}>Jenis</th>
                    <th style={{ width: '25%' }}>Keperluan</th>
                    <th style={{ width: '20%' }}>Waktu</th>
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
                      <td>{row.jenis || '-'}</td>
                      <td>{row.keperluan || '-'}</td>
                      <td className="font-mono text-xs">
                        {row.jamMulai ? `${row.jamMulai} - ${row.jamSelesai || ''}` : 'Sehari'}
                      </td>
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
