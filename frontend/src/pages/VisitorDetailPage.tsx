import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getVisitor, updateVisitorStatus } from '../api/visitors.api';
import { type Visitor } from '../types/visitor';
import { Layout } from '../components/Layout';

export function VisitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    if (!id) return;
    try {
      const data = await getVisitor(Number(id));
      setVisitor(data);
    } catch {
      navigate('/visitors');
    }
    setLoading(false);
  }

  async function handleToggleStatus() {
    if (!visitor) return;
    setToggling(true);
    try {
      await updateVisitorStatus(visitor.id, !visitor.isActive);
      await load();
    } catch { /* ignore */ }
    setToggling(false);
  }

  if (loading) return <Layout><p className="text-sm text-gray-500">Loading...</p></Layout>;
  if (!visitor) return null;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Visitor Detail</h1>
        <div className="flex gap-2">
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => navigate(`/visitors/${visitor.id}/edit`)}
              className="bg-blue-700 text-white text-sm px-4 py-2 rounded hover:bg-blue-800"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => navigate('/visitors')}
            className="text-sm px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>

      <div className="bg-white border rounded p-6 max-w-lg">
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">Visitor Code</p>
          <p className="font-mono text-sm font-medium">{visitor.visitorCode}</p>
        </div>
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">Name</p>
          <p className="text-sm">{visitor.visitorName}</p>
        </div>
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">Company</p>
          <p className="text-sm">{visitor.company?.companyName}</p>
        </div>
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">Phone Number</p>
          <p className="text-sm">{visitor.phoneNumber || '-'}</p>
        </div>
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">Status</p>
          <span className={`text-xs px-2 py-0.5 rounded ${visitor.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {visitor.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">Created At</p>
          <p className="text-sm">{new Date(visitor.createdAt).toLocaleString()}</p>
        </div>
        {visitor.updatedAt && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1">Updated At</p>
            <p className="text-sm">{new Date(visitor.updatedAt).toLocaleString()}</p>
          </div>
        )}

        {user?.role === 'ADMIN' && (
          <div className="pt-4 border-t mt-4">
            <button
              onClick={handleToggleStatus}
              disabled={toggling}
              className="text-sm px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              {toggling ? 'Saving...' : visitor.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
