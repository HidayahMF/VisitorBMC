import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listVisitors } from '../api/visitors.api';
import { listCompanies } from '../api/companies.api';
import { type Visitor } from '../types/visitor';
import { type Company } from '../types/company';
import { Layout } from '../components/Layout';

export function VisitorsPage() {
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

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
      const res = await listVisitors({ q: search || undefined, companyId: filterCompany, page, limit: 20 });
      setVisitors(res.data);
      setTotal(res.pagination.total);
    } catch { /* ignore */ }
    setLoading(false);
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Visitors</h1>
        <button onClick={() => navigate('/visitors/new')} className="bg-blue-700 text-white text-sm px-4 py-2 rounded hover:bg-blue-800">
          + Add Visitor
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name or code..." className="flex-1 max-w-sm px-3 py-2 border border-gray-300 rounded text-sm" />
        <select value={filterCompany ?? ''} onChange={(e) => { setFilterCompany(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded text-sm">
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
        </select>
      </div>

      {loading ? <p className="text-sm text-gray-500">Loading...</p> : (
        <>
          <p className="text-xs text-gray-400 mb-2">{total} visitor{total !== 1 ? 's' : ''}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Code</th><th className="py-2">Name</th><th className="py-2">Company</th><th className="py-2">Phone</th><th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map(v => (
                <tr key={v.id} className="border-b">
                  <td className="py-2 font-mono text-xs">{v.visitorCode}</td>
                  <td className="py-2">
                    <button onClick={() => navigate(`/visitors/${v.id}`)} className="text-blue-700 hover:underline">{v.visitorName}</button>
                  </td>
                  <td className="py-2 text-gray-600">{v.company?.companyName}</td>
                  <td className="py-2 text-gray-500">{v.phoneNumber || '-'}</td>
                  <td className="py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${v.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visitors.length === 0 && <p className="text-sm text-gray-400 mt-2">No visitors found.</p>}
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
