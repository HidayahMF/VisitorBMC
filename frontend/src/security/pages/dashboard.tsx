import { useState, useEffect } from 'react';
import { fetchOverview } from '../api';
import { type Overview } from '../types';
import { Icon } from '../../components/Icon';

export function SecurityDashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
                    <span className={item.status === 'SEDANG_TUGAS_LUAR' ? 'activity-status security-travel-time' : 'activity-status security-permit-type'}>
                     {item.status === 'SEDANG_TUGAS_LUAR' ? `Aktual: ${item.departureTime || '-'}` : `Surat: ${item.jamKeluar || '-'}`}
                  </span>
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
    </div>
  );
}
