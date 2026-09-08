import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export function ConnectionStatus() {
  const [offline, setOffline] = useState(false);
  const check = async () => { try { await apiClient('/health'); setOffline(false); } catch { setOffline(true); } };
  useEffect(() => { void check(); const id = window.setInterval(() => void check(), 60000); return () => window.clearInterval(id); }, []);
  if (!offline) return null;
  return <div className="connection-banner" role="alert"><span>Koneksi ke server terputus. Data mungkin tidak tersedia.</span><button type="button" onClick={() => void check()}>Coba Lagi</button></div>;
}
