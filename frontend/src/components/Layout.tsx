import { useState, useEffect, useRef, type ReactNode } from 'react';
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
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMobileOpen(false); setAdminOpen(false); setAccountOpen(false); menuButtonRef.current?.focus(); } };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, []);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const links: { to: string; label: string; icon: IconName; exact?: boolean; exclude?: string[]; roles?: string[] }[] = [
    { to: '/dashboard', label: t('navigation.dashboard'), icon: 'dashboard', exact: true },
    { to: '/companies', label: t('navigation.companies'), icon: 'building' },
    { to: '/visitors', label: t('navigation.visitors'), icon: 'users' },
    { to: '/visits', label: t('navigation.visits'), icon: 'calendar', exclude: ['/visits/active'] },
    { to: '/visits/active', label: t('navigation.inside'), icon: 'inside', exact: true },
  ];
  const adminLinks = [
    { to: '/safety-inductions/manage', label: t('navigation.safetyContent'), icon: 'building' as IconName, roles: ['ADMIN', 'SECURITY'] },
    { to: '/audit-log', label: t('navigation.auditLog'), icon: 'calendar' as IconName, roles: ['ADMIN'] },
    { to: '/reports', label: t('navigation.reports'), icon: 'calendar' as IconName, roles: ['ADMIN', 'SECURITY'] },
    { to: '/safety-inductions/config', label: t('navigation.configuration'), icon: 'building' as IconName, roles: ['ADMIN'] },
    { to: '/users', label: t('navigation.users'), icon: 'users' as IconName, roles: ['ADMIN'] },
  ].filter((link) => link.roles.includes(user?.role || ''));
  const adminActive = adminLinks.some((link) => isNavRouteActive(location.pathname, link));

  return (
    <div className="app-shell min-h-screen bg-gray-50">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand-area">
            <Link to="/dashboard" className="brand-link" aria-label="BMC Visitor Management">
              <img src={logo} alt="Braja Mukti Cakra" className="brand-logo" />
            </Link>
            <nav id="main-navigation" className={`app-nav ${mobileOpen ? 'is-open' : ''}`} aria-label="Navigasi utama">
              <div className="mobile-nav-heading">{t('navigation.main')}</div>
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`nav-link ${
                    isNavRouteActive(location.pathname, link)
                      ? 'is-active'
                      : ''
                  }`}
                >
                  <Icon name={link.icon} size={16} />
                  {link.label}
                </Link>
              ))}
              {adminLinks.length > 0 && <div className="admin-nav-menu"><button type="button" className={`nav-link admin-nav-trigger ${adminActive ? 'is-active' : ''}`} onClick={() => setAdminOpen((open) => !open)} aria-expanded={adminOpen} aria-controls="admin-navigation"><Icon name="building" size={16} />{t('navigation.administration')}<Icon name={adminOpen ? 'chevron-up' : 'chevron-down'} size={13} /></button><div id="admin-navigation" className={`admin-nav-dropdown ${adminOpen ? 'is-open' : ''}`}>{adminLinks.map((link) => <Link key={link.to} to={link.to} onClick={() => { setAdminOpen(false); setMobileOpen(false); }} className={`nav-link ${isNavRouteActive(location.pathname, link) ? 'is-active' : ''}`}><Icon name={link.icon} size={16} />{link.label}</Link>)}</div></div>}
            </nav>
          </div>
          <div className="user-area">
            <div className="language-switcher" role="group" aria-label={t('language.label')}><button type="button" className={language === 'en' ? 'is-selected' : ''} aria-pressed={language === 'en'} aria-label={t('language.switchToEnglish')} onClick={() => setLanguage('en')}>EN</button><span aria-hidden="true">|</span><button type="button" className={language === 'id' ? 'is-selected' : ''} aria-pressed={language === 'id'} aria-label={t('language.switchToIndonesian')} onClick={() => setLanguage('id')}>ID</button></div>
            <div className="account-menu" ref={accountRef}><button type="button" className="account-trigger" onClick={() => setAccountOpen((open) => !open)} aria-expanded={accountOpen} aria-controls="account-navigation" title={user?.name}><span className="user-avatar" aria-hidden="true">{user?.name?.charAt(0) || 'U'}</span><span className="account-name">{user?.name}</span><Icon name="chevron-down" size={13} /></button><div id="account-navigation" className={`account-dropdown ${accountOpen ? 'is-open' : ''}`}><strong>{user?.name}</strong><span>{user?.role}</span><button type="button" onClick={() => void logout()}><Icon name="logout" size={16} />{t('navigation.logout')}</button></div></div>
            <button
              type="button"
              className="mobile-menu-button"
              ref={menuButtonRef}
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
              aria-expanded={mobileOpen}
              aria-controls="main-navigation"
            >
              <Icon name={mobileOpen ? 'close' : 'menu'} size={20} />
            </button>
          </div>
        </div>
      </header>
      <ConnectionStatus /><main className="app-main">{children}</main><ConfirmationHost />
    </div>
  );
}
