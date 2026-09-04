import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listVisits } from '../api/visits.api';
import { listCompanies } from '../api/companies.api';
import { Layout } from '../components/Layout';
import { type Visit, type VisitStatus } from '../types/visit';
import { type Company } from '../types/company';
import { visitStatusLabel } from '../utils/visit-status';

export function VisitsPage() {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState<number | undefined>();
  const [filterStatus, setFilterStatus] = useState<VisitStatus | ''>('');
  const [filterDate, setFilterDate] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCompanies(); }, []);
  useEffect(() => { load(); }, [search, filterCompany, filterStatus, filterDate, page]);

  async function loadCompanies() {
    try {
      const res = await listCompanies({ active: true, limit: 100 });
      setCompanies(res.data);
    } catch { /* ignore */ }
  }

  async function load() {
    setLoading(true);
    try {
      const res = await listVisits({
        q: search || undefined,
        companyId: filterCompany,
        status: filterStatus || undefined,
        date: filterDate || undefined,
        page,
        limit: 20,
      });
      setVisits(res.data);
      setTotal(res.pagination.total);
    } catch { /* ignore */ }
    setLoading(false);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'PENDING_INDUCTION':
        return <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">{visitStatusLabel(status as VisitStatus)}</span>;
      case 'READY_FOR_CHECKIN':
        return <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{visitStatusLabel(status as VisitStatus)}</span>;
      case 'IN':
        return <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">{visitStatusLabel(status as VisitStatus)}</span>;
      case 'OUT':
        return <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{visitStatusLabel(status as VisitStatus)}</span>;
      case 'CANCELLED':
        return <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Cancelled</span>;
      default:
        return <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{status}</span>;
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Visits</h1>
        <button onClick={() => navigate('/visits/new')} className="bg-blue-700 text-white text-sm px-4 py-2 rounded hover:bg-blue-800">
          + New Visit
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search visit code or host..."
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
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as VisitStatus | ''); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded text-sm"
        >
          <option value="">All Status</option>
          <option value="PENDING_INDUCTION">Pending Induction</option>
          <option value="READY_FOR_CHECKIN">Ready for Check-In</option>
          <option value="IN">Inside</option>
          <option value="OUT">Checked Out</option>
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded text-sm"
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-2">{total} visit{total !== 1 ? 's' : ''}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Visit Code</th>
                <th className="py-2">Date</th>
                <th className="py-2">Company</th>
                <th className="py-2">Host</th>
                <th className="py-2">Visitors</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {visits.map(v => (
                <tr key={v.Id} className="border-b cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/visits/${v.Id}`)}>
                  <td className="py-2 font-mono text-xs">{v.VisitCode}</td>
                  <td className="py-2">{new Date(v.VisitDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                  <td className="py-2 text-gray-600">{v.CompanyName}</td>
                  <td className="py-2 text-gray-600">{v.HostName}</td>
                  <td className="py-2 text-gray-600">{v.VisitorCount ?? '-'}</td>
                  <td className="py-2">{getStatusBadge(v.Status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visits.length === 0 && <p className="text-sm text-gray-400 mt-2">No visits found.</p>}
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
