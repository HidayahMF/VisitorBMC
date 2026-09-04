import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <Layout>
      <h1 className="text-xl font-bold mb-4">Dashboard</h1>
      <div className="bg-white p-6 rounded shadow-sm border">
        <p className="text-gray-600">Welcome, {user?.name}</p>
        <p className="text-sm text-gray-500 mb-4">Role: {user?.role}</p>
        <div className="flex gap-4">
          <Link to="/companies" className="text-sm text-blue-700 hover:underline">Companies →</Link>
          <Link to="/visitors" className="text-sm text-blue-700 hover:underline">Visitors →</Link>
        </div>
      </div>
    </Layout>
  );
}
