import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createVisitor } from '../api/visitors.api';
import { searchCompanies } from '../api/companies.api';
import { Layout } from '../components/Layout';
import { type Company } from '../types/company';
import { type PotentialMatch } from '../types/visitor';

export function AddVisitorPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [companyQuery, setCompanyQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyResults, setCompanyResults] = useState<Company[]>([]);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ code: string; name: string } | null>(null);
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  function handleCompanySearch(q: string) {
    setCompanyQuery(q);
    setSelectedCompany(null);
    setCompanyOpen(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (q.trim().length === 0) { setCompanyResults([]); return; }
    timeoutRef.current = setTimeout(async () => {
      try {
        const data = await searchCompanies(q);
        setCompanyResults(data);
      } catch { /* ignore */ }
    }, 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCompany) { setError('Please select a company'); return; }
    setLoading(true);
    setError('');
    setSuccess(null);
    setPotentialMatches([]);
    try {
      const res = await createVisitor({ visitorName: name, companyId: selectedCompany.id, phoneNumber: phone || undefined });
      setSuccess({ code: res.visitor.visitorCode, name: res.visitor.visitorName });
      if (res.potentialMatches && res.potentialMatches.length > 0) {
        setPotentialMatches(res.potentialMatches);
      }
      setName(''); setPhone(''); setSelectedCompany(null); setCompanyQuery('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
    setLoading(false);
  }

  return (
    <Layout>
      <h1 className="text-xl font-bold mb-4">Add Visitor</h1>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4">{error}</div>}
      {success && (
        <div className="bg-green-50 text-green-700 p-3 rounded text-sm mb-4">
          Created: {success.code} — {success.name}
        </div>
      )}
      {potentialMatches.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm mb-4">
          <p className="font-medium text-yellow-800 mb-2">Possible existing visitors found:</p>
          {potentialMatches.map((m) => (
            <div key={m.Id} className="flex items-center gap-3 py-1 text-yellow-700">
              <span className="font-mono text-xs">{m.VisitorCode}</span>
              <span>{m.VisitorName}</span>
              {m.PhoneNumber && <span className="text-xs text-yellow-600">{m.PhoneNumber}</span>}
              <button
                type="button"
                onClick={() => navigate(`/visitors/${m.Id}`)}
                className="text-xs text-yellow-800 underline hover:text-yellow-900"
              >
                View
              </button>
            </div>
          ))}
          <p className="text-xs text-yellow-600 mt-2">These visitors share a similar name and company. Check if the visitor already exists before creating a new one.</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="max-w-sm">
        <label className="block text-sm font-medium mb-1">Visitor Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-3" required disabled={loading} />

        <label className="block text-sm font-medium mb-1">Company</label>
        <div className="relative mb-3">
          <input type="text" value={companyQuery} onChange={(e) => handleCompanySearch(e.target.value)} placeholder="Search company..." className="w-full px-3 py-2 border border-gray-300 rounded text-sm" autoComplete="off" disabled={loading} />
          {companyOpen && companyResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow max-h-48 overflow-y-auto">
              {companyResults.map(c => (
                <button key={c.id} type="button" onClick={() => { setSelectedCompany(c); setCompanyQuery(c.companyName); setCompanyOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{c.companyName}</button>
              ))}
            </div>
          )}
        </div>

        <label className="block text-sm font-medium mb-1">Phone Number (Optional)</label>
        <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-4" disabled={loading} />

        <div className="flex gap-2">
          <button type="button" onClick={() => navigate('/visitors')} className="px-4 py-2 border text-sm rounded" disabled={loading}>Cancel</button>
          <button type="submit" className="bg-blue-700 text-white px-4 py-2 text-sm rounded hover:bg-blue-800 disabled:opacity-50" disabled={loading}>{loading ? 'Saving...' : 'Save Visitor'}</button>
        </div>
      </form>
    </Layout>
  );
}
