import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { deleteVisitor, getVisitor, updateVisitorStatus, getVisitorVisitHistory } from '../api/visitors.api';
import { getVisitorInductionHistory } from '../api/safety-inductions.api';
import { type Visitor, type VisitorVisitHistoryEntry } from '../types/visitor';
import { type InductionRecord } from '../types/induction';
import { Layout } from '../components/Layout';
import { DevDeleteButton } from '../components/DevFillButton';
import { ErrorState } from '../components/AsyncState';
import { userFacingError } from '../api/client';
import { confirmAction } from '../components/ConfirmationHost';
import { useLanguage } from '../i18n/LanguageContext';

function statusLabel(status: string, t: (key: string) => string) {
  const keys: Record<string, string> = { PENDING_INDUCTION: 'status.required', READY_FOR_CHECKIN: 'status.ready', IN: 'status.inside', OUT: 'status.out', CANCELLED: 'status.cancelled', VALID: 'status.valid', REQUIRED: 'status.required', EXPIRED: 'status.expired' };
  return t(keys[status] || 'common.noData');
}

function statusBadge(status: string, t: (key: string) => string) {
  const colors: Record<string, string> = { PENDING_INDUCTION: 'bg-amber-100 text-amber-700', READY_FOR_CHECKIN: 'bg-blue-100 text-blue-700', IN: 'bg-blue-100 text-blue-700', OUT: 'bg-gray-100 text-gray-700', CANCELLED: 'bg-red-100 text-red-700', VALID: 'bg-green-100 text-green-700', REQUIRED: 'bg-amber-100 text-amber-700', EXPIRED: 'bg-red-100 text-red-700' };
  return <span className={`status-badge ${colors[status] || 'bg-gray-100 text-gray-700'}`}>{statusLabel(status, t)}</span>;
}

function activityBadge(isActive: boolean, t: (key: string) => string) {
  return <span className={`status-badge ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{isActive ? t('detail.active') : t('detail.inactive')}</span>;
}

export function VisitorDetailPage() {
  const { id } = useParams<{ id: string }>(); const navigate = useNavigate(); const { user } = useAuth(); const { language, t, formatDate } = useLanguage();
  const [visitor, setVisitor] = useState<Visitor | null>(null); const [visitHistory, setVisitHistory] = useState<VisitorVisitHistoryEntry[]>([]); const [inductionHistory, setInductionHistory] = useState<InductionRecord[]>([]); const [loading, setLoading] = useState(true); const [toggling, setToggling] = useState(false); const [error, setError] = useState('');
  const formatTime = (value: string | null) => value ? new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '-';
  useEffect(() => { void load(); }, [id]);
  async function load() { if (!id) return; setLoading(true); setError(''); try { const numericId = Number(id); const [visitorData, visits, inductions] = await Promise.all([getVisitor(numericId), getVisitorVisitHistory(numericId), getVisitorInductionHistory(numericId)]); setVisitor(visitorData); setVisitHistory(visits); setInductionHistory(inductions); } catch (cause) { setError(userFacingError(cause, language)); } finally { setLoading(false); } }
  async function handleToggleStatus() { if (!visitor || toggling) return; setToggling(true); setError(''); try { await updateVisitorStatus(visitor.id, !visitor.isActive); await load(); } catch (cause) { setError(userFacingError(cause, language)); } finally { setToggling(false); } }
  async function handleDelete() { if (!visitor || !await confirmAction(`${t('detail.remove')}: "${visitor.visitorName}"?`)) return; try { await deleteVisitor(visitor.id); navigate('/visitors'); } catch (cause) { setError(userFacingError(cause, language)); } }
  if (loading) return <Layout><p className="text-sm text-gray-500">{t('common.loading')}</p></Layout>;
  if (!visitor) return <Layout><ErrorState message={error || t('common.noData')} onRetry={load} /></Layout>;
  return <Layout><div className="visitor-detail-page">
    {error && <div className="mb-4"><ErrorState message={error} onRetry={load} /></div>}
    <header className="detail-page-header"><div><p className="detail-eyebrow">{t('detail.visitorManagement')}</p><h1>{t('detail.visitorDetail')}</h1><p className="detail-code">{visitor.visitorCode}</p></div><div className="detail-actions"><button type="button" onClick={() => navigate('/visitors')} className="secondary-button">{t('detail.back')}</button>{user?.role === 'ADMIN' && <button type="button" onClick={() => navigate(`/visitors/${visitor.id}/edit`)} className="primary-button">{t('common.edit')}</button>}{user?.role === 'ADMIN' && <DevDeleteButton onClick={handleDelete} />}</div></header>
    <div className="visitor-detail-grid">
      <section className="visitor-identity-panel" aria-labelledby="visitor-identity-title"><p className="detail-eyebrow">{t('detail.visitor')}</p><h2 id="visitor-identity-title">{visitor.visitorName}</h2><div className="identity-code-row"><span>{visitor.visitorCode}</span>{activityBadge(visitor.isActive, t)}</div><dl className="visitor-meta"><div><dt>{t('detail.company')}</dt><dd>{visitor.company?.companyName || '-'}</dd></div><div><dt>{t('detail.phone')}</dt><dd>{visitor.phoneNumber || '-'}</dd></div><div><dt>{t('detail.createdAt')}</dt><dd>{formatDate(visitor.createdAt)}</dd></div></dl>{user?.role === 'ADMIN' && <button type="button" onClick={handleToggleStatus} disabled={toggling} className="secondary-button identity-action">{toggling ? t('common.update') : visitor.isActive ? t('common.deactivate') : t('common.activate')}</button>}</section>
      <section className="detail-section" aria-labelledby="visit-history-title"><div className="section-heading"><h2 id="visit-history-title">{t('detail.visitHistory')}</h2><span>{visitHistory.length}</span></div>{visitHistory.length === 0 ? <p className="detail-empty">{t('detail.noVisitHistory')}</p> : <div className="history-list">{visitHistory.map((visit) => <article key={visit.VisitId} className="history-row"><div className="history-row-top"><button type="button" className="history-code" onClick={() => navigate(`/visits/${visit.VisitId}`)}>{visit.VisitCode}</button>{statusBadge(visit.Status, t)}</div><p className="history-company">{visit.CompanyName}</p><p className="history-host">{t('detail.host')}: {visit.HostName}</p><p className="history-purpose">{visit.Purpose}</p><p className="history-date">{formatDate(visit.VisitDate)}{visit.CheckInTime ? ` · ${t('detail.checkIn')} ${formatTime(visit.CheckInTime)}` : ''}{visit.CheckOutTime ? ` · ${t('detail.checkOut')} ${formatTime(visit.CheckOutTime)}` : ''}</p></article>)}</div>}</section>
    </div>
    <section className="detail-section safety-history-section" aria-labelledby="safety-history-title"><div className="section-heading"><h2 id="safety-history-title">{t('detail.safetyHistory')}</h2><span>{inductionHistory.length}</span></div>{inductionHistory.length === 0 ? <p className="detail-empty">{t('detail.noSafetyHistory')}</p> : <div className="safety-history-list">{inductionHistory.map((record) => <article key={record.Id} className="safety-history-row"><div className="safety-history-title"><strong>Safety Induction V{record.InductionVersion}</strong><span className="status-badge bg-green-100 text-green-700">{t('status.valid')}</span></div><dl className="safety-meta"><div><dt>{t('detail.completed')}</dt><dd>{formatDate(record.CompletedAt)}</dd></div><div><dt>{t('detail.validUntil')}</dt><dd>{formatDate(record.ValidUntil)}</dd></div><div><dt>{t('detail.visit')}</dt><dd>{record.VisitId ? `#${record.VisitId}` : '-'}</dd></div><div><dt>{t('detail.acknowledgement')}</dt><dd className={record.Acknowledged ? 'text-green-700' : 'text-gray-500'}>{record.Acknowledged ? t('detail.acknowledged') : t('detail.notAcknowledged')}</dd></div></dl></article>)}</div>}</section>
  </div></Layout>;
}
