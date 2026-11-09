import { useState, useEffect } from 'react';
import { fetchOverview, returnTravel } from '../api';
import { type Overview } from '../types';
import { Icon } from '../../components/Icon';

export function SecurityDashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [returnTarget, setReturnTarget] = useState<{ id: number | string; nip: string; nama: string } | null>(null);
  const [returnTime, setReturnTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchOverview();
      setOverview(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat ringkasan');
    } finally {
      setLoading(false);
    }
  }

  async function handleReturn() {
    if (!returnTarget) return;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(returnTime)) {
      setError('Jam kembali harus berformat HH:MM.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await returnTravel(returnTarget.id, returnTarget.nip, returnTime);
      setSuccess(`${returnTarget.nama} berhasil dicatat sudah kembali.`);
      setReturnTarget(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal mencatat kembali');
    } finally {
      setSubmitting(false);
    }
  }

  const currentDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  if (loading) {
    return <div className="bg-white border rounded p-6 text-gray-500">Memuat ringkasan...</div>;
  }

  if (error) {
    return <div className="bg-red-50 text-red-700 p-4 rounded text-sm">{error}</div>;
  }

  const counts = overview?.counts || { travel: 0, izin: 0, kembali: 0 };

  return (
    <div className="space-y-6">
      <section className="dashboard-intro">
        <div>
          <p className="dashboard-kicker">Security — BMC Online</p>
          <h1 className="!mb-0">Ringkasan Gate</h1>
          <p className="dashboard-subtitle">Status real-time aktivitas keluar-masuk karyawan hari ini.</p>
        </div>
        <div className="dashboard-date">
          <Icon name="clock" size={16} /> {currentDate}
        </div>
      </section>

      <div className="metric-grid">
        <article className="metric-card metric-blue">
          <div className="metric-icon"><Icon name="calendar" size={18} /></div>
          <p className="metric-label">Sedang Tugas Luar</p>
          <p className="metric-value">{counts.travel}</p>
          <p className="metric-unit">Sudah dicatat Security</p>
        </article>

        <article className="metric-card metric-amber">
          <div className="metric-icon"><Icon name="users" size={18} /></div>
          <p className="metric-label">Izin Keluar / Sehari</p>
          <p className="metric-value">{counts.izin}</p>
          <p className="metric-unit">Karyawan izin hari ini</p>
        </article>

        <article className="metric-card metric-cyan">
          <div className="metric-icon"><Icon name="inside" size={18} /></div>
          <p className="metric-label">Sudah Kembali</p>
          <p className="metric-value">{counts.kembali}</p>
          <p className="metric-unit">Orang telah kembali</p>
        </article>
      </div>

      {success && <div className="bg-green-50 text-green-700 border border-green-200 p-3 rounded text-sm" role="status">{success}</div>}

      <div className="dashboard-operations-grid">
        <section className="dashboard-operation-section">
          <div className="dashboard-section-head">
            <div>
            <h2>Status Tugas Luar</h2>
              <span>Approval HRIS dan checkpoint Security</span>
            </div>
          </div>
          {overview?.travel.length === 0 ? (
            <div className="dashboard-calm-state">Tidak ada tugas luar aktif saat ini.</div>
          ) : (
            <div className="activity-list">
              {overview?.travel.map((item) => (
                <div key={item.id} className="activity-row">
                  <div className="activity-main">
                    <strong>{item.nama}</strong>
                    <span>NIP: {item.nip} — {item.tujuan}</span>
                    <span className="text-xs text-gray-500 mt-0.5">{item.keperluan}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={item.status === 'SEDANG_TUGAS_LUAR' ? 'activity-status security-travel-time' : 'activity-status security-permit-type'}>
                      {item.status === 'SEDANG_TUGAS_LUAR' ? `Aktual: ${item.departureTime || '-'}` : `Surat: ${item.jamKeluar || '-'}`}
                    </span>
                    {item.status === 'SEDANG_TUGAS_LUAR' && <button type="button" className="primary-button !min-h-[32px] !py-1 !text-xs !bg-emerald-600 !border-emerald-600 hover:!bg-emerald-700" onClick={() => { setReturnTime(new Date().toTimeString().slice(0, 5)); setReturnTarget({ id: item.id, nip: item.nip, nama: item.nama }); }}>Catat Kembali</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-operation-section">
          <div className="dashboard-section-head">
            <div>
              <h2>Sudah Kembali Hari Ini</h2>
              <span>Karyawan yang telah kembali ke kantor</span>
            </div>
          </div>
          {overview?.kembali.length === 0 ? (
            <div className="dashboard-calm-state">Belum ada karyawan yang tercatat kembali.</div>
          ) : (
            <div className="activity-list">
              {overview?.kembali.map((item) => (
                <div key={item.id} className="activity-row">
                  <div className="activity-main">
                    <strong>{item.nama}</strong>
                    <span>NIP: {item.nip} — Dari: {item.tujuan}</span>
                  </div>
                  <span className="activity-status security-return-time">
                    Kembali: {item.jamKembali}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {returnTarget && <div className="content-preview-backdrop" role="dialog" aria-modal="true" aria-labelledby="dashboard-return-title">
        <div className="bg-white rounded p-6 max-w-sm w-full space-y-4 shadow-xl border">
          <h3 id="dashboard-return-title" className="font-bold text-base text-ink">Konfirmasi Kepulangan</h3>
          <p className="text-sm text-gray-600">Konfirmasi kepulangan untuk <strong>{returnTarget.nama}</strong> ({returnTarget.nip})?</p>
          <label className="block text-sm font-semibold text-gray-700" htmlFor="dashboard-return-time">Jam kembali
            <input id="dashboard-return-time" type="time" value={returnTime} onChange={(event) => setReturnTime(event.target.value)} className="mt-1 block w-full" disabled={submitting} required />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="secondary-button" onClick={() => setReturnTarget(null)} disabled={submitting}>Batal</button>
            <button type="button" className="primary-button !bg-emerald-600 !border-emerald-600 hover:!bg-emerald-700" onClick={() => void handleReturn()} disabled={submitting}>{submitting ? 'Menyimpan...' : 'Ya, Catat Kembali'}</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
