import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteVisit, getVisit, checkInVisit, checkOutVisit } from '../api/visits.api';
import { Layout } from '../components/Layout';
import { type VisitDetail } from '../types/visit';
import { useAuth } from '../context/AuthContext';
import { DevDeleteButton } from '../components/DevFillButton';
import { ErrorState } from '../components/AsyncState';
import { userFacingError } from '../api/client';
import { confirmAction } from '../components/ConfirmationHost';
import { issueInductionToken } from '../api/safety-inductions.api';
import { useLanguage } from '../i18n/LanguageContext';
import { VisitorBadge } from '../components/VisitorBadge';

export function VisitDetailPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [printBadge, setPrintBadge] = useState(false);
  const [inductionLoading, setInductionLoading] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    if (!id) return;
    try {
      const data = await getVisit(Number(id));
      setVisit(data);
    } catch (cause) {
      setError(userFacingError(cause, language));
    }
    setLoading(false);
  }

  async function handleCheckIn() {
    if (!id) return;
    if (!await confirmAction('Lakukan check-in untuk kunjungan ini?')) return;
    setActionLoading(true);
    try {
      const updated = await checkInVisit(Number(id));
      setVisit(updated);
    } catch {
      setError('Gagal melakukan check-in. Pastikan semua pengunjung sudah menyelesaikan induction.');
    }
    setActionLoading(false);
  }

  async function handleCheckOut() {
    if (!id) return;
    if (!await confirmAction('Lakukan check-out untuk kunjungan ini?')) return;
    setActionLoading(true);
    try {
      const updated = await checkOutVisit(Number(id));
      setVisit(updated);
    } catch {
      setError('Gagal melakukan check-out.');
    }
    setActionLoading(false);
  }

  async function startInduction() {
    if (!visit || inductionLoading) return;
    setInductionLoading(true); setError('');
    try { const access = await issueInductionToken(visit.Id); navigate(`/safety-induction/${access.token}`); }
    catch (cause) { setError(userFacingError(cause, language)); }
    finally { setInductionLoading(false); }
  }

  async function handleDelete() {
    if (!id || !visit || !await confirmAction(`Hapus kunjungan ${visit.VisitCode}?`)) return;
    try {
      await deleteVisit(Number(id));
      navigate('/visits');
    } catch {
      setError('Gagal menghapus kunjungan.');
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'VALID':
        return <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">VALID</span>;
      case 'REQUIRED':
        return <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">REQUIRED</span>;
      case 'EXPIRED':
        return <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">EXPIRED</span>;
       case 'PENDING_INDUCTION':
         return <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">Perlu Induksi</span>;
       case 'READY_FOR_CHECKIN':
         return <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">Siap Masuk</span>;
       case 'IN':
         return <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Di Dalam</span>;
       case 'OUT':
         return <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">Sudah Keluar</span>;
       case 'CANCELLED':
         return <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Dibatalkan</span>;
      default:
        return <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{status}</span>;
    }
  }

  if (loading) return <Layout><p className="text-sm text-gray-500">{t('common.loading')}</p></Layout>;
  if (!visit) return <Layout><ErrorState message={error || 'Data kunjungan tidak tersedia.'} onRetry={load} /></Layout>;

  return (
    <Layout>
      <div className="max-w-2xl">
        {error && <div className="mb-4"><ErrorState message={error} onRetry={load} /></div>}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold font-mono">{visit.VisitCode}</h1>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPrintBadge(true)} className="no-print text-sm px-4 py-2 border border-gray-300 rounded hover:bg-gray-50" aria-label="Cetak badge pengunjung">Cetak badge</button>
              {user?.role === 'ADMIN' && <DevDeleteButton onClick={handleDelete} />}
              <button
                onClick={() => navigate('/visits')}
                className="text-sm px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Back
              </button>
            </div>
        </div>

        {printBadge && <div className="badge-preview-shell no-print"><VisitorBadge visit={visit} /><div className="badge-actions"><button type="button" onClick={() => window.print()} className="bg-blue-700 text-white px-4 py-2 rounded text-sm">Cetak Badge</button><button type="button" onClick={() => setPrintBadge(false)} className="border px-4 py-2 rounded text-sm">Tutup</button></div></div>}

        <div className="bg-white border rounded p-6 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-gray-500 text-xs">Company</p>
              <p className="font-medium">{visit.Company.CompanyName}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Host</p>
              <p className="font-medium">{visit.HostName}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Purpose</p>
              <p className="font-medium">{visit.Purpose}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Date</p>
              <p className="font-medium">{new Date(visit.VisitDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          {visit.CheckInTime && (
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p className="text-gray-500 text-xs">Check-In Time</p>
                <p className="font-medium">{new Date(visit.CheckInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              {visit.CheckOutTime && (
                <div>
                  <p className="text-gray-500 text-xs">Check-Out Time</p>
                  <p className="font-medium">{new Date(visit.CheckOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              )}
            </div>
          )}

          <div className="mb-4">
            <p className="text-gray-500 text-xs mb-1">Status</p>
            {getStatusBadge(visit.Status)}
          </div>

          {visit.Status === 'PENDING_INDUCTION' && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800 mb-4">
              Safety Induction is required for {visit.SafetySummary.requiresInduction} visitor(s).
            </div>
          )}

          {visit.Status === 'READY_FOR_CHECKIN' && (
            <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800 mb-4">
              All visitors cleared. Ready for check-in.
            </div>
          )}

          {visit.Status === 'IN' && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800 mb-4">
              Visit is currently inside the facility.
            </div>
          )}

          {visit.Status === 'OUT' && (
            <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-600 mb-4">
              This visit has been completed.
            </div>
          )}

          <div className="flex gap-2">
            {visit.Status === 'PENDING_INDUCTION' && (
              <button
                onClick={() => void startInduction()}
                disabled={inductionLoading}
                className="text-sm px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
              >
                {inductionLoading ? 'Menyiapkan...' : 'Mulai Safety Induction'}
              </button>
            )}
            {visit.Status === 'READY_FOR_CHECKIN' && (
              <button
                onClick={handleCheckIn}
                disabled={actionLoading}
                className="text-sm px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-40"
              >
                {actionLoading ? 'Memproses...' : 'Masuk'}
              </button>
            )}
            {visit.Status === 'IN' && (
              <button
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="text-sm px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-40"
              >
                {actionLoading ? 'Memproses...' : 'Keluar'}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white border rounded p-6">
          <h2 className="font-medium mb-4">Visitors ({visit.Visitors.length})</h2>

          <div className="mb-4 text-sm text-gray-600">
            {visit.SafetySummary.cleared} cleared · {visit.SafetySummary.requiresInduction} require induction
          </div>

           <div className="space-y-2 visit-detail-desktop-list">
            {visit.Visitors.map(v => (
              <div key={v.Id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium">{v.VisitorName}</p>
                  <p className="text-xs text-gray-500">{v.VisitorCode}</p>
           </div>
           <div className="mobile-record-list visit-detail-mobile-list">{visit.Visitors.map(v => <article key={v.Id} className="mobile-record-card"><div className="mobile-record-heading"><div><strong>{v.VisitorName}</strong><p className="text-xs text-gray-500">{v.VisitorCode}</p></div>{getStatusBadge(v.SafetyStatus)}</div><dl className="mobile-record-details"><div><dt>Status safety</dt><dd>{v.SafetyStatus}</dd></div><div><dt>Berlaku sampai</dt><dd>{v.ValidUntil ? new Date(v.ValidUntil).toLocaleDateString('id-ID') : '-'}</dd></div></dl>{v.SafetyStatus !== 'VALID' && visit.Status === 'PENDING_INDUCTION' && <button type="button" onClick={() => void startInduction()} disabled={inductionLoading} className="mt-3 text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded disabled:opacity-40">{inductionLoading ? 'Menyiapkan...' : 'Mulai induction'}</button>}</article>)}</div>
                <div className="flex items-center gap-2">
                  {v.ValidUntil && (
                    <span className="text-xs text-gray-500">
                      Until {new Date(v.ValidUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {getStatusBadge(v.SafetyStatus)}
                  {v.SafetyStatus !== 'VALID' && visit.Status === 'PENDING_INDUCTION' && (
                    <button
                       onClick={() => void startInduction()}
                       disabled={inductionLoading}
                      className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                    >
                      Induct
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
