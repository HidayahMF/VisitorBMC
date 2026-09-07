import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveVisits, checkOutVisit } from '../api/visits.api';
import { listCompanies } from '../api/companies.api';
import { Layout } from '../components/Layout';
import { type Visit } from '../types/visit';
import { type Company } from '../types/company';

export function ActiveVisitsPage() {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<number | null>(null);

  useEffect(() => { loadCompanies(); }, []);
  useEffect(() => { load(); }, [search, filterCompany, page]);

  async function loadCompanies() {
    try {
      const res = await listCompanies({ active: true, limit: 100 });
      setCompanies(res.data);
    } catch { /* ignore */ }
  }

  async function load() {
    setLoading(true);
    try {
      const res = await getActiveVisits({
        q: search || undefined,
        companyId: filterCompany,
        page,
        limit: 20,
      });
      setVisits(res.data);
      setTotal(res.pagination.total);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleCheckout(visitId: number) {
    if (!confirm('Check out this visit?')) return;
    setCheckingOut(visitId);
    try {
      await checkOutVisit(visitId);
      load();
    } catch {
      alert('Failed to check out');
    }
    setCheckingOut(null);
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Currently Inside</h1>
        <span className="text-sm text-gray-500">{total} visit{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search visit code, host, or visitor..."
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded text-sm"
        />
        <select
          value={filterCompany ?? ''}
          onChange={(e) => { setFilterCompany(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded text-sm"
        >
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <div className="space-y-2">
            {visits.map(v => (
              <div key={v.Id} className="bg-white border rounded p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold">{v.VisitCode}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Inside</span>
                    </div>
                    <div className="text-sm text-gray-700">
                      {v.CompanyName} — {v.HostName}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {v.VisitorCount} visitor{v.VisitorCount !== 1 ? 's' : ''} · {v.Purpose}
                    </div>
                    {v.CheckInTime && (
                      <div className="text-xs text-gray-400 mt-1">
                        Check-in: {new Date(v.CheckInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/visits/${v.Id}`)}
                      className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Detail
                    </button>
                    <button
                      onClick={() => handleCheckout(v.Id)}
                      disabled={checkingOut === v.Id}
                      className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-40"
                    >
                      {checkingOut === v.Id ? 'Checking out...' : 'Check Out'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {visits.length === 0 && (
            <p className="text-sm text-gray-400 mt-2">No visitors currently inside.</p>
          )}
          {total > 20 && (
            <div className="flex gap-2 mt-4">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-sm px-3 py-1 border rounded disabled:opacity-40">Prev</button>
              <span className="text-sm text-gray-500 py-1">Page {page}</span>
              <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="text-sm px-3 py-1 border rounded disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
