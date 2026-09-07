import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { deleteVisitor, getVisitor, updateVisitorStatus, getVisitorVisitHistory } from '../api/visitors.api';
import { getVisitorInductionHistory } from '../api/safety-inductions.api';
import { type Visitor, type VisitorVisitHistoryEntry } from '../types/visitor';
import { type InductionRecord } from '../types/induction';
import { Layout } from '../components/Layout';
import { DevDeleteButton } from '../components/DevFillButton';

function formatDate(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    PENDING_INDUCTION: 'bg-amber-100 text-amber-700',
    READY_FOR_CHECKIN: 'bg-blue-100 text-blue-700',
    IN: 'bg-green-100 text-green-700',
    OUT: 'bg-gray-100 text-gray-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };
  return <span className={`text-xs px-2 py-0.5 rounded ${map[status] || 'bg-gray-100 text-gray-700'}`}>{status.replace(/_/g, ' ')}</span>;
}

export function VisitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [visitHistory, setVisitHistory] = useState<VisitorVisitHistoryEntry[]>([]);
  const [inductionHistory, setInductionHistory] = useState<InductionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    if (!id) return;
    try {
      const numericId = Number(id);
      const [visitorData, visitData, inductionData] = await Promise.all([
        getVisitor(numericId),
        getVisitorVisitHistory(numericId),
        getVisitorInductionHistory(numericId).catch(() => [] as InductionRecord[]),
      ]);
      setVisitor(visitorData);
      setVisitHistory(visitData);
      setInductionHistory(inductionData);
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

  async function handleDelete() {
    if (!visitor || !confirm(`Hapus visitor "${visitor.visitorName}"?`)) return;
    try {
      await deleteVisitor(visitor.id);
      navigate('/visitors');
    } catch {
      alert('Failed to delete visitor');
    }
  }

  if (loading) return <Layout><p className="text-sm text-gray-500">Loading...</p></Layout>;
  if (!visitor) return null;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Visitor Detail</h1>
          <div className="flex gap-2">
          {user?.role === 'ADMIN' && <DevDeleteButton onClick={handleDelete} />}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile */}
        <div className="bg-white border rounded p-6">
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
            <p className="text-sm">{formatDate(visitor.createdAt)}</p>
          </div>

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

        {/* Visit History */}
        <div className="bg-white border rounded p-6 lg:col-span-2">
          <h2 className="font-medium mb-4">Visit History</h2>
          {visitHistory.length === 0 ? (
            <p className="text-sm text-gray-400">No visits recorded.</p>
          ) : (
            <div className="space-y-2">
              {visitHistory.map((v) => (
                <div key={v.VisitId} className="p-3 bg-gray-50 rounded">
                  <div className="flex items-center justify-between">
                    <span
                      className="font-mono text-xs font-bold cursor-pointer hover:underline"
                      onClick={() => navigate(`/visits/${v.VisitId}`)}
                    >
                      {v.VisitCode}
                    </span>
                    {statusBadge(v.Status)}
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    {v.CompanyName} — {v.HostName}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{v.Purpose}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatDate(v.VisitDate)} ·
                    {v.CheckInTime ? ` IN ${formatTime(v.CheckInTime)}` : ' not checked in'}
                    {v.CheckOutTime ? ` · OUT ${formatTime(v.CheckOutTime)}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Safety Induction History */}
      <div className="bg-white border rounded p-6 mt-4">
        <h2 className="font-medium mb-4">Safety Induction History</h2>
        {inductionHistory.length === 0 ? (
          <p className="text-sm text-gray-400">No safety induction completed.</p>
        ) : (
          <div className="space-y-2">
            {inductionHistory.map((r) => (
              <div key={r.Id} className="p-3 bg-gray-50 rounded flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Safety Induction V{r.InductionVersion}</p>
                  <p className="text-xs text-gray-500">
                    Completed {formatDate(r.CompletedAt)}
                    {r.VisitId ? ` · Visit #${r.VisitId}` : ''}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <div className="text-gray-500">Valid until {formatDate(r.ValidUntil)}</div>
                  <div className={r.Acknowledged ? 'text-green-600' : 'text-gray-400'}>
                    {r.Acknowledged ? 'Acknowledged' : 'Not acknowledged'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
