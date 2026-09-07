import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { getDashboardStats } from '../api/visits.api';
import { type DashboardStats } from '../types/dashboard';

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch { /* ignore */ }
    setLoading(false);
  }

  return (
    <Layout>
      <h1 className="text-xl font-bold mb-4">Dashboard</h1>

      <div className="mb-6">
        <p className="text-gray-600">Welcome, <span className="font-medium">{user?.name}</span></p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading stats...</p>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border rounded p-4">
            <p className="text-xs text-gray-500 mb-1">Visitors Today</p>
            <p className="text-2xl font-bold text-blue-700">{stats.visitorsToday}</p>
          </div>
          <div className="bg-white border rounded p-4">
            <p className="text-xs text-gray-500 mb-1">Currently Inside</p>
            <p className="text-2xl font-bold text-green-700">{stats.currentlyInside}</p>
          </div>
          <div className="bg-white border rounded p-4">
            <p className="text-xs text-gray-500 mb-1">Checked Out Today</p>
            <p className="text-2xl font-bold text-gray-700">{stats.checkedOutToday}</p>
          </div>
          <div className="bg-white border rounded p-4">
            <p className="text-xs text-gray-500 mb-1">Induction Required</p>
            <p className="text-2xl font-bold text-amber-600">{stats.inductionRequiredToday}</p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/visits/new" className="bg-white border rounded p-4 hover:bg-gray-50 text-center">
          <div className="text-2xl mb-1">+</div>
          <p className="text-sm font-medium">New Visit</p>
        </Link>
        <Link to="/visits/active" className="bg-white border rounded p-4 hover:bg-gray-50 text-center">
          <div className="text-2xl mb-1">&#128101;</div>
          <p className="text-sm font-medium">Currently Inside</p>
        </Link>
        <Link to="/visits" className="bg-white border rounded p-4 hover:bg-gray-50 text-center">
          <div className="text-2xl mb-1">&#128196;</div>
          <p className="text-sm font-medium">Visit History</p>
        </Link>
        <Link to="/companies" className="bg-white border rounded p-4 hover:bg-gray-50 text-center">
          <div className="text-2xl mb-1">&#127970;</div>
          <p className="text-sm font-medium">Companies</p>
        </Link>
      </div>
    </Layout>
  );
}
