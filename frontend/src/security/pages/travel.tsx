import { useState, useEffect } from 'react';
import { departTravel, fetchOverview, returnTravel, fetchReport } from '../api';
import { type Travel, type ReportRow } from '../types';

export function SecurityTravelPage() {
  const [items, setItems] = useState<Travel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmId, setConfirmId] = useState<{ id: number | string; nip: string; nama: string } | null>(null);
  const [returnTime, setReturnTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [departureId, setDepartureId] = useState<Travel | null>(null);
  const [departureTime, setDepartureTime] = useState(() => new Date().toTimeString().slice(0, 5));
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
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(returnTime)) {
      setError('Jam kembali harus berformat HH:MM.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await returnTravel(confirmId.id, confirmId.nip, returnTime);
      setSuccess(`${confirmId.nama} berhasil dicatat sudah kembali.`);
      setConfirmId(null);
      await load();
      window.setTimeout(() => setSuccess(''), 4000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal mencatat kembali');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeparture() {
    if (!departureId) return;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(departureTime)) { setError('Jam keberangkatan harus berformat HH:MM.'); return; }
    setSubmitting(true);
    try {
      await departTravel(departureId.id, departureId.nip, departureTime);
      setSuccess(`${departureId.nama} berhasil dicatat berangkat.`);
      setDepartureId(null);
      await load();
      window.setTimeout(() => setSuccess(''), 4000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal mencatat keberangkatan'); }
    finally { setSubmitting(false); }
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
      {success && <div className="bg-green-50 text-green-700 border border-green-200 p-3 rounded mb-4 text-sm" role="status">{success}</div>}

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
                  <th rowSpan={2} style={{ width: '20%' }}>Status</th>
                  <th rowSpan={2} style={{ width: '22%' }}>Karyawan</th>
                  <th rowSpan={2} style={{ width: '25%' }}>Tujuan & Keperluan</th>
                  <th colSpan={2} className="text-center">Jam Berangkat</th>
                  <th rowSpan={2} className="text-right" style={{ width: '15%' }}>Aksi</th>
                </tr>
                <tr>
                  <th style={{ width: '9%' }}>Jam Surat</th>
                  <th style={{ width: '9%' }}>Jam Aktual</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className={`status-badge ${item.status === 'SEDANG_TUGAS_LUAR' ? 'security-travel-time' : 'security-permit-type'}`}>
                        {item.status === 'SEDANG_TUGAS_LUAR' ? 'Sedang Tugas Luar' : 'Akan Tugas Luar'}
                      </span>
                    </td>
                    <td>
                      <strong className="company-name">{item.nama}</strong>
                      <span className="text-xs text-gray-500 font-mono">NIP: {item.nip}</span>
                    </td>
                    <td>
                      <div className="table-primary-text">{item.tujuan}</div>
                      <div className="text-xs text-gray-500">{item.keperluan}</div>
                    </td>
                    <td>
                      <span className="status-badge security-scheduled-time">{item.jamKeluar || '-'}</span>
                    </td>
                    <td>
                      <span className="status-badge security-departure-time">{item.departureTime || '-'}</span>
                    </td>
                    <td className="text-right">
                      {item.status === 'AKAN_TUGAS_LUAR' ? <button
                        type="button"
                        onClick={() => { setDepartureTime(new Date().toTimeString().slice(0, 5)); setDepartureId(item); }}
                        className="primary-button security-depart-button !min-h-[32px] !py-1 !text-xs"
                      >
                        Catat Berangkat
                      </button> : <button type="button" onClick={() => { setReturnTime(new Date().toTimeString().slice(0, 5)); setConfirmId({ id: item.id, nip: item.nip, nama: item.nama }); }} className="primary-button !min-h-[32px] !py-1 !text-xs !bg-emerald-600 !border-emerald-600 hover:!bg-emerald-700">Catat Kembali</button>}
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
                    <th rowSpan={2} style={{ width: '12%' }}>Tanggal</th>
                    <th rowSpan={2} style={{ width: '25%' }}>Karyawan</th>
                    <th rowSpan={2} style={{ width: '23%' }}>Tujuan</th>
                    <th colSpan={2} className="text-center">Jam Berangkat</th>
                    <th rowSpan={2} style={{ width: '15%' }}>Jam Kembali</th>
                  </tr>
                  <tr>
                    <th style={{ width: '12.5%' }}>Jam Surat</th>
                    <th style={{ width: '12.5%' }}>Jam Aktual</th>
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
                      <td className="font-mono text-xs">{row.departureTime || '-'}</td>
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
            <label className="block text-sm font-semibold text-gray-700" htmlFor="return-time">
              Jam kembali
              <input id="return-time" type="time" value={returnTime} onChange={(event) => setReturnTime(event.target.value)} className="mt-1 block w-full" disabled={submitting} required />
            </label>
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
      {departureId && <div className="content-preview-backdrop"><div className="bg-white rounded p-6 max-w-sm w-full space-y-4 shadow-xl border"><h3 className="font-bold text-base text-ink">Konfirmasi Keberangkatan</h3><p className="text-sm text-gray-600">Catat <strong>{departureId.nama}</strong> sebagai sedang tugas luar?</p><label className="block text-sm font-semibold text-gray-700" htmlFor="departure-time">Jam berangkat<input id="departure-time" type="time" value={departureTime} onChange={(event) => setDepartureTime(event.target.value)} className="mt-1 block w-full" disabled={submitting} /></label><div className="flex justify-end gap-2"><button type="button" className="secondary-button" onClick={() => setDepartureId(null)} disabled={submitting}>Batal</button><button type="button" className="primary-button !bg-blue-600 !border-blue-600" onClick={handleDeparture} disabled={submitting}>{submitting ? 'Menyimpan...' : 'Ya, Catat Berangkat'}</button></div></div></div>}
    </div>
  );
}
