import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon, type IconName } from './Icon';
import logo from '../assets/logobmcbg1.png';
import { isNavRouteActive } from '../utils/nav';

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const links: { to: string; label: string; icon: IconName; exact?: boolean; exclude?: string[]; roles?: string[] }[] = [
    { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', exact: true },
    { to: '/companies', label: 'Companies', icon: 'building' },
    { to: '/visitors', label: 'Visitors', icon: 'users' },
    { to: '/visits', label: 'Visits', icon: 'calendar', exclude: ['/visits/active'] },
    { to: '/visits/active', label: 'Inside', icon: 'inside', exact: true },
    { to: '/safety-inductions/manage', label: 'Safety Content', icon: 'building', exact: true, roles: ['ADMIN', 'SECURITY'] },
  ];

  return (
    <div className="app-shell min-h-screen bg-gray-50">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand-area">
            <Link to="/dashboard" className="brand-link" aria-label="BMC Visitor Management">
              <img src={logo} alt="Braja Mukti Cakra" className="brand-logo" />
            </Link>
            <nav className={`app-nav ${mobileOpen ? 'is-open' : ''}`} aria-label="Main navigation">
              {links.filter((link) => !link.roles || link.roles.includes(user?.role || '')).map((link) => (
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
            </nav>
          </div>
          <div className="user-area">
            <div className="user-avatar" aria-hidden="true">{user?.name?.charAt(0) || 'U'}</div>
            <div className="user-copy">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.role}</span>
            </div>
            <button onClick={logout} className="logout-button" title="Logout">
              <Icon name="logout" size={17} />
              <span>Logout</span>
            </button>
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              <Icon name={mobileOpen ? 'close' : 'menu'} size={20} />
            </button>
          </div>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
