import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listCompanies, updateCompanyStatus } from '../api/companies.api';
import { type Company } from '../types/company';
import { Layout } from '../components/Layout';

export function CompaniesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [search, page]);

  async function load() {
    setLoading(true);
    try {
      const res = await listCompanies({ q: search || undefined, page, limit: 20 });
      setCompanies(res.data);
      setTotal(res.pagination.total);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleToggleStatus(c: Company) {
    try {
      await updateCompanyStatus(c.id, !c.isActive);
      load();
    } catch { /* ignore */ }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Companies</h1>
        <button
          onClick={() => navigate('/companies/new')}
          className="bg-blue-700 text-white text-sm px-4 py-2 rounded hover:bg-blue-800"
        >
          + Add Company
        </button>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder="Search company..."
        className="w-full max-w-md px-3 py-2 border border-gray-300 rounded text-sm mb-4"
      />

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-2">{total} company{total !== 1 ? 'ies' : ''}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Company Name</th>
                <th className="py-2">Status</th>
                {user?.role === 'ADMIN' && <th className="py-2 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b">
                   <td className="py-2">
                     {user?.role === 'ADMIN' ? (
                       <button onClick={() => navigate(`/companies/${c.id}/edit`)} className="text-blue-700 hover:underline">
                         {c.companyName}
                       </button>
                     ) : c.companyName}
                  </td>
                  <td className="py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {user?.role === 'ADMIN' && (
                    <td className="py-2 text-right">
                      <button onClick={() => handleToggleStatus(c)} className="text-xs text-gray-500 hover:text-gray-800">
                        {c.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {companies.length === 0 && <p className="text-sm text-gray-400 mt-2">No companies found.</p>}
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
