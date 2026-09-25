import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { Layout } from '../components/Layout';
import { Icon, type IconName } from '../components/Icon';
import { deleteVisit, getDashboardStats, listVisits } from '../api/visits.api';
import { type DashboardStats } from '../types/dashboard';
import { ErrorState } from '../components/AsyncState';
import { type Visit } from '../types/visit';
import { userFacingError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { DevDeleteButton } from '../components/DevFillButton';
import { confirmAction } from '../components/ConfirmationHost';

export function DashboardPage() {
  const { user } = useAuth();
  const { language, t, formatDate } = useLanguage();
  const metrics: { key: keyof DashboardStats; label: string; icon: IconName; tone: string }[] = [
    { key: 'visitorsToday', label: t('dashboard.metrics.visitorsToday'), icon: 'users', tone: 'metric-blue' },
    { key: 'currentlyInside', label: t('dashboard.metrics.currentlyInside'), icon: 'inside', tone: 'metric-cyan' },
    { key: 'checkedOutToday', label: t('dashboard.metrics.checkedOutToday'), icon: 'check', tone: 'metric-slate' },
    { key: 'inductionRequiredToday', label: t('dashboard.metrics.inductionRequiredToday'), icon: 'alert', tone: 'metric-amber' },
  ];
  const actions: { to: string; title: string; description: string; icon: IconName; primary?: boolean }[] = [
    { to: '/visits/new', title: t('dashboard.newVisit'), description: t('dashboard.newVisitDescription'), icon: 'plus', primary: true },
    { to: '/visits/active', title: t('dashboard.inside'), description: t('dashboard.insideDescription'), icon: 'inside' },
    { to: '/visits', title: t('dashboard.history'), description: t('dashboard.historyDescription'), icon: 'calendar' },
    { to: '/companies', title: t('dashboard.companies'), description: t('dashboard.companiesDescription'), icon: 'building' },
  ];
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<Visit[]>([]);
  const [activityError, setActivityError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    setActivityError('');
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [dashboardStats, visits] = await Promise.all([getDashboardStats(), listVisits({ date: today, limit: 8 })]);
      setStats(dashboardStats);
      setActivity(visits.data);
    } catch (cause) { setError(userFacingError(cause, language)); setActivityError(userFacingError(cause, language)); }
    finally { setLoading(false); }
  }

  async function handleDelete(visit: Visit) {
    if (!await confirmAction(`${t('common.delete')} ${visit.VisitCode}?`, { confirmLabel: t('common.delete'), cancelLabel: t('common.cancel') })) return;
    try { await deleteVisit(visit.Id); await load(); }
    catch (cause) { setError(userFacingError(cause, language)); }
  }

  return (
    <Layout>
      <section className="dashboard-intro">
        <div>
          <p className="dashboard-kicker">{t('dashboard.eyebrow')}</p>
          <h1 className="!mb-0">{t('dashboard.title')}</h1>
          <p className="dashboard-subtitle">{t('dashboard.subtitle')}</p>
        </div>
        <div className="dashboard-date"><Icon name="clock" size={16} /> {formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </section>

      {error ? <ErrorState message={error} onRetry={load} /> : loading ? (
          <div className="bg-white border rounded p-6 text-gray-500">{t('common.loading')}</div>
      ) : stats ? (
        <div className="metric-grid">
          {metrics.map((metric) => (
            <article key={metric.key} className={`metric-card ${metric.tone}`}>
              <div className="metric-icon"><Icon name={metric.icon} size={18} /></div>
              <p className="metric-label">{metric.label}</p>
              <p className="metric-value">{stats[metric.key]}</p>
              <p className="metric-unit">{metric.key === 'inductionRequiredToday' ? t('dashboard.visitors') : t('dashboard.people')}</p>
            </article>
          ))}
        </div>
      ) : null}

      <section>
        <div className="dashboard-section-head">
          <h2>{t('dashboard.quickActions')}</h2>
          <span>{t('dashboard.quickAccess')}</span>
        </div>
        <div className="quick-actions">
          {actions.map((action) => (
            <Link key={action.to} to={action.to} className={`quick-action ${action.primary ? 'primary' : ''}`}>
              <span className="quick-icon"><Icon name={action.icon} size={18} /></span>
              <span className="quick-copy"><strong>{action.title}</strong><span>{action.description}</span></span>
              <Icon name="arrow-right" size={16} className="ml-auto" />
            </Link>
          ))}
        </div>
      </section>

       <div className="dashboard-operations-grid">
         <section className="dashboard-operation-section attention-section"><div className="dashboard-section-head"><div><h2>{t('dashboard.attention')}</h2></div></div>{stats && stats.inductionRequiredToday > 0 ? <Link to="/visits" className="attention-item"><span className="attention-marker" aria-hidden="true" /><span><strong>{t('dashboard.metrics.inductionRequiredToday')}</strong><small>{stats.inductionRequiredToday} {t('dashboard.visitors')}</small></span><span className="dashboard-section-link">{t('dashboard.view')}</span></Link> : <div className="dashboard-calm-state">{t('dashboard.noAttention')}</div>}</section>
         <section className="dashboard-operation-section activity-section">
          <div className="dashboard-section-head"><div><h2>{t('dashboard.activity')}</h2><span>{t('dashboard.activityDescription')}</span></div><Link to="/visits" className="dashboard-section-link">{t('dashboard.view')}</Link></div>
           {activityError ? <ErrorState message={activityError} onRetry={load} /> : activity.length === 0 ? <div className="dashboard-calm-state">{t('dashboard.noActivity')}</div> : <div className="activity-list">{activity.map(visit => <div key={visit.Id} className="activity-row"><Link to={`/visits/${visit.Id}`} className="activity-main"><strong>{visit.VisitCode}</strong><span>{visit.CompanyName}</span></Link><div className="activity-meta"><span>{visit.VisitorCount ?? '-'} {t('dashboard.visitors')}</span><span>{t('dashboard.host')}: {visit.HostName}</span></div><span className="activity-status">{visit.Status === 'OUT' ? t('status.out') : visit.Status === 'IN' ? t('status.inside') : visit.Status === 'READY_FOR_CHECKIN' ? t('status.ready') : t('status.required')}</span>{user?.role === 'ADMIN' && <DevDeleteButton onClick={() => handleDelete(visit)} />}</div>)}</div>}
        </section>
       </div>
    </Layout>
  );
}
