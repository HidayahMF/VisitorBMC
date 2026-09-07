import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getVisitor, updateVisitor } from '../api/visitors.api';
import { searchCompanies } from '../api/companies.api';
import { Layout } from '../components/Layout';
import { type Company } from '../types/company';
import { type Visitor } from '../types/visitor';
import { DevFillButton } from '../components/DevFillButton';

export function EditVisitorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [name, setName] = useState('');
  const [companyQuery, setCompanyQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyResults, setCompanyResults] = useState<Company[]>([]);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    if (!id) return;
    try {
      const data = await getVisitor(Number(id));
      setVisitor(data);
      setName(data.visitorName);
      setPhone(data.phoneNumber || '');
      setSelectedCompany(data.company);
      setCompanyQuery(data.company?.companyName || '');
    } catch {
      navigate('/visitors');
    }
    setLoading(false);
  }

  function handleCompanySearch(q: string) {
    setCompanyQuery(q);
    setSelectedCompany(null);
    setCompanyOpen(true);
    if (q.trim().length === 0) { setCompanyResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const data = await searchCompanies(q);
        setCompanyResults(data);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    if (!selectedCompany) { setError('Please select a company'); return; }
    setSaving(true);
    setError('');
    try {
      await updateVisitor(Number(id), {
        visitorName: name,
        companyId: selectedCompany.id,
        phoneNumber: phone || undefined,
      });
      navigate(`/visitors/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
    setSaving(false);
  }

  function fillExample() {
    setName('Visitor Development Updated');
    setPhone('081234567890');
  }

  if (loading) return <Layout><p className="text-sm text-gray-500">Loading...</p></Layout>;
  if (!visitor) return null;

  return (
    <Layout>
      <h1 className="text-xl font-bold mb-4">Edit Visitor</h1>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4">{error}</div>}
      <div className="mb-4"><DevFillButton onClick={fillExample} /></div>
      <form onSubmit={handleSubmit} className="max-w-sm">
        <div className="mb-3">
          <label className="block text-xs text-gray-400 mb-1">Visitor Code</label>
          <p className="font-mono text-sm text-gray-600">{visitor.visitorCode}</p>
        </div>

        <label className="block text-sm font-medium mb-1">Visitor Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-3"
          required
          disabled={saving}
        />

        <label className="block text-sm font-medium mb-1">Company</label>
        <div className="relative mb-3">
          <input
            type="text"
            value={companyQuery}
            onChange={(e) => handleCompanySearch(e.target.value)}
            placeholder="Search company..."
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            autoComplete="off"
            disabled={saving}
          />
          {companyOpen && companyResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow max-h-48 overflow-y-auto">
              {companyResults.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setSelectedCompany(c); setCompanyQuery(c.companyName); setCompanyOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                >
                  {c.companyName}
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="block text-sm font-medium mb-1">Phone Number (Optional)</label>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-4"
          disabled={saving}
        />

        <div className="flex gap-2">
          <button type="button" onClick={() => navigate(`/visitors/${id}`)} className="px-4 py-2 border text-sm rounded" disabled={saving}>Cancel</button>
          <button type="submit" className="bg-blue-700 text-white px-4 py-2 text-sm rounded hover:bg-blue-800 disabled:opacity-50" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Layout>
  );
}
