import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { fetchOverview } from './api';
import './security.css';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export function SecurityGate() {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">Memeriksa akses...</div>;
  if (isAuthenticated && ['ADMIN', 'SECURITY', 'MONITORING'].includes(user?.role || '')) {
    return <Outlet />;
  }
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

export function SecurityShell() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    void poll();
    const timer = setInterval(() => void poll(), 20000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  async function poll() {
    try {
      await fetchOverview();
      setStale(false);
    } catch {
      setStale(true);
    }
  }

  return (
    <Layout>
      <div className="bmc-security">
        {stale && <div className="connection-banner" role="status">Menampilkan data terakhir saat koneksi putus</div>}
        <Outlet />
      </div>
    </Layout>
  );
}
