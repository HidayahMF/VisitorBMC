import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon, type IconName } from './Icon';
import logo from '../assets/logobmcbg1.png';
import { isNavRouteActive } from '../utils/nav';
import { ConnectionStatus } from './ConnectionStatus';
import { ConfirmationHost } from './ConfirmationHost';
import { useLanguage } from '../i18n/LanguageContext';

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { language, t } = useLanguage();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const links: { to: string; label: string; icon: IconName; exact?: boolean; exclude?: string[]; roles?: string[] }[] = [
    { to: '/dashboard', label: t('navigation.dashboard'), icon: 'dashboard', exact: true },
    { to: '/companies', label: t('navigation.companies'), icon: 'building' },
    { to: '/visitors', label: t('navigation.visitors'), icon: 'users' },
    { to: '/visits', label: t('navigation.visits'), icon: 'calendar', exclude: ['/visits/active'] },
    { to: '/visits/active', label: t('navigation.inside'), icon: 'inside', exact: true },
    { to: '/security/dashboard', label: 'Security — BMC Online', icon: 'inside', exact: true },
  ];
  const adminLinks = [
    { to: '/safety-inductions/manage', label: t('navigation.safetyContent'), icon: 'building' as IconName, roles: ['ADMIN', 'SECURITY', 'MONITORING'] },
    { to: '/audit-log', label: t('navigation.auditLog'), icon: 'calendar' as IconName, roles: ['ADMIN'] },
    { to: '/reports', label: t('navigation.reports'), icon: 'calendar' as IconName, roles: ['ADMIN', 'SECURITY', 'MONITORING'] },
    { to: '/safety-inductions/config', label: t('navigation.configuration'), icon: 'building' as IconName, roles: ['ADMIN'] },
    { to: '/users', label: t('navigation.users'), icon: 'users' as IconName, roles: ['ADMIN'] },
  ].filter((link) => link.roles.includes(user?.role || ''));
  const securityActive = location.pathname.startsWith('/security/');

  return (
    <div className="app-shell app-sidebar-shell min-h-screen bg-gray-50">
      <aside className={`app-sidebar ${mobileOpen ? 'is-open' : ''}`} aria-label="Navigasi utama">
        <div className="app-sidebar-brand">
          <Link to="/dashboard" onClick={() => setMobileOpen(false)} aria-label="BMC Visitor Management">
            <img src={logo} alt="Braja Mukti Cakra" />
          </Link>
          <span>VISITOR MANAGEMENT</span>
        </div>
        <nav className="app-sidebar-nav" id="main-navigation">
          <p>Workspace</p>
          {links.filter((link) => link.to !== '/security/dashboard').map((link) => (
            <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)} className={`app-sidebar-link ${isNavRouteActive(location.pathname, link) ? 'is-active' : ''}`}>
              <Icon name={link.icon} size={17} />{link.label}
            </Link>
          ))}
          <p className="app-sidebar-section">Security — BMC Online</p>
          <Link to="/security/dashboard" onClick={() => setMobileOpen(false)} className={`app-sidebar-link ${securityActive && location.pathname === '/security/dashboard' ? 'is-active' : ''}`}><Icon name="dashboard" size={17} />Ringkasan</Link>
          <Link to="/security/tugas-luar" onClick={() => setMobileOpen(false)} className={`app-sidebar-link ${location.pathname === '/security/tugas-luar' ? 'is-active' : ''}`}><Icon name="calendar" size={17} />Tugas Luar</Link>
          <Link to="/security/izin" onClick={() => setMobileOpen(false)} className={`app-sidebar-link ${location.pathname === '/security/izin' ? 'is-active' : ''}`}><Icon name="users" size={17} />Izin</Link>
          <Link to="/security/kembali" onClick={() => setMobileOpen(false)} className={`app-sidebar-link ${location.pathname === '/security/kembali' ? 'is-active' : ''}`}><Icon name="arrow-right" size={17} />Kembali</Link>
          {adminLinks.length > 0 && <p className="app-sidebar-section">{t('navigation.administration')}</p>}
          {adminLinks.map((link) => <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)} className={`app-sidebar-link ${isNavRouteActive(location.pathname, link) ? 'is-active' : ''}`}><Icon name={link.icon} size={17} />{link.label}</Link>)}
        </nav>
        <div className="app-sidebar-footer">
          <div className="app-sidebar-account"><span className="user-avatar">{user?.name?.charAt(0) || 'U'}</span><span><strong>{user?.name}</strong><small>{user?.role}</small></span></div>
          <button type="button" onClick={() => void logout()}><Icon name="logout" size={16} />{t('navigation.logout')}</button>
        </div>
      </aside>
      {mobileOpen && <button type="button" className="app-sidebar-backdrop" aria-label="Tutup navigasi" onClick={() => setMobileOpen(false)} />}
      <div className="app-sidebar-content">
        <header className="app-mobile-header"><button type="button" onClick={() => setMobileOpen(true)} aria-label="Buka navigasi"><Icon name="menu" size={20} /></button><strong>Visitor Management & Safety Induction</strong><span className="language-switcher">{language.toUpperCase()}</span></header>
        <ConnectionStatus /><main className="app-main">{children}</main><ConfirmationHost />
      </div>
    </div>
  );
}
