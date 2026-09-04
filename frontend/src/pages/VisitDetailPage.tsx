import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getVisit } from '../api/visits.api';
import { Layout } from '../components/Layout';
import { type VisitDetail } from '../types/visit';

export function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    if (!id) return;
    try {
      const data = await getVisit(Number(id));
      setVisit(data);
    } catch {
      navigate('/visits');
    }
    setLoading(false);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'VALID':
        return <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">VALID</span>;
      case 'REQUIRED':
        return <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">REQUIRED</span>;
      case 'EXPIRED':
        return <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">EXPIRED</span>;
      case 'PENDING_INDUCTION':
        return <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">Pending Induction</span>;
      case 'READY_FOR_CHECKIN':
        return <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">Ready for Check-In</span>;
      case 'IN':
        return <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Inside</span>;
      case 'OUT':
        return <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">Checked Out</span>;
      case 'CANCELLED':
        return <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Cancelled</span>;
      default:
        return <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{status}</span>;
    }
  }

  if (loading) return <Layout><p className="text-sm text-gray-500">Loading...</p></Layout>;
  if (!visit) return null;

  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold font-mono">{visit.VisitCode}</h1>
          <button
            onClick={() => navigate('/visits')}
            className="text-sm px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Back
          </button>
        </div>

        <div className="bg-white border rounded p-6 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-gray-500 text-xs">Company</p>
              <p className="font-medium">{visit.Company.CompanyName}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Host</p>
              <p className="font-medium">{visit.HostName}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Purpose</p>
              <p className="font-medium">{visit.Purpose}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Date</p>
              <p className="font-medium">{new Date(visit.VisitDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-gray-500 text-xs mb-1">Status</p>
            {getStatusBadge(visit.Status)}
          </div>

          {visit.Status === 'PENDING_INDUCTION' && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800 mb-4">
              Safety Induction is required for {visit.SafetySummary.requiresInduction} visitor(s).
            </div>
          )}

          {visit.Status === 'READY_FOR_CHECKIN' && (
            <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800 mb-4">
              All visitors cleared. Ready for check-in.
            </div>
          )}
        </div>

        <div className="bg-white border rounded p-6">
          <h2 className="font-medium mb-4">Visitors ({visit.Visitors.length})</h2>

          <div className="mb-4 text-sm text-gray-600">
            {visit.SafetySummary.cleared} cleared · {visit.SafetySummary.requiresInduction} require induction
          </div>

          <div className="space-y-2">
            {visit.Visitors.map(v => (
              <div key={v.Id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium">{v.VisitorName}</p>
                  <p className="text-xs text-gray-500">{v.VisitorCode}</p>
                </div>
                <div className="flex items-center gap-2">
                  {v.ValidUntil && (
                    <span className="text-xs text-gray-500">
                      Until {new Date(v.ValidUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {getStatusBadge(v.SafetyStatus)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}