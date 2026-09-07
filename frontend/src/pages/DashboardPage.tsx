import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Icon, type IconName } from '../components/Icon';
import { getDashboardStats } from '../api/visits.api';
import { type DashboardStats } from '../types/dashboard';

const metrics: { key: keyof DashboardStats; label: string; icon: IconName; tone: string }[] = [
  { key: 'visitorsToday', label: 'Visitors Today', icon: 'users', tone: 'metric-blue' },
  { key: 'currentlyInside', label: 'Currently Inside', icon: 'inside', tone: 'metric-cyan' },
  { key: 'checkedOutToday', label: 'Checked Out Today', icon: 'check', tone: 'metric-slate' },
  { key: 'inductionRequiredToday', label: 'Induction Required', icon: 'alert', tone: 'metric-amber' },
];

const actions: { to: string; title: string; description: string; icon: IconName; primary?: boolean }[] = [
  { to: '/visits/new', title: 'New Visit', description: 'Register a new visitor arrival', icon: 'plus', primary: true },
  { to: '/visits/active', title: 'Currently Inside', description: 'See who is on site now', icon: 'inside' },
  { to: '/visits', title: 'Visit History', description: 'Review previous visits', icon: 'calendar' },
  { to: '/companies', title: 'Companies', description: 'Manage registered companies', icon: 'building' },
];

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => undefined).finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <section className="dashboard-intro">
        <div>
          <p className="dashboard-kicker">Operations overview</p>
          <h1 className="!mb-0">Dashboard</h1>
          <p className="dashboard-subtitle">Ringkasan aktivitas visitor dan kondisi area hari ini.</p>
        </div>
        <div className="dashboard-date"><Icon name="clock" size={16} /> Selamat datang, {user?.name}</div>
      </section>

      {loading ? (
        <div className="bg-white border rounded p-6 text-gray-500">Loading dashboard data...</div>
      ) : stats ? (
        <div className="metric-grid">
          {metrics.map((metric) => (
            <article key={metric.key} className={`metric-card ${metric.tone}`}>
              <div className="metric-icon"><Icon name={metric.icon} size={18} /></div>
              <p className="metric-label">{metric.label}</p>
              <p className="metric-value">{stats[metric.key]}</p>
            </article>
          ))}
        </div>
      ) : null}

      <section>
        <div className="dashboard-section-head">
          <h2>Quick actions</h2>
          <span>Common workflows</span>
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
    </Layout>
  );
}
