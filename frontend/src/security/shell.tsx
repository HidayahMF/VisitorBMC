import { useEffect, useState } from 'react';
import { Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { fetchOverview, getToken } from './api';
import { isMock } from './mock';
import './security.css';
import { Layout } from '../components/Layout';

function useMockMode(): boolean {
  const [searchParams] = useSearchParams();
  return isMock() || searchParams.has('mock');
}

export function SecurityGate() {
  const mockMode = useMockMode();
  if (mockMode || getToken()) {
    return <Outlet />;
  }
  return <Navigate to="/security/login" replace />;
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
