import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/companies', label: 'Companies' },
    { to: '/visitors', label: 'Visitors' },
    { to: '/visits', label: 'Visits' },
    { to: '/visits/active', label: 'Inside' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="text-lg font-bold text-blue-900">BMC</Link>
            <nav className="flex gap-1">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-1.5 text-sm rounded ${
                    location.pathname === link.to || (link.to !== '/dashboard' && location.pathname.startsWith(link.to))
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">{user?.name}</span>
            <span className="text-xs text-gray-400">{user?.role}</span>
            <button onClick={logout} className="text-gray-500 hover:text-gray-800">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
