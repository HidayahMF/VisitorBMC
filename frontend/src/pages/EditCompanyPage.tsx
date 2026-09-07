import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCompany, updateCompany } from '../api/companies.api';
import { Layout } from '../components/Layout';
import { DevFillButton } from '../components/DevFillButton';

export function EditCompanyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    if (!id) return;
    try {
      const c = await getCompany(Number(id));
      setName(c.companyName);
    } catch {
      navigate('/companies');
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError('');
    try {
      await updateCompany(Number(id), { companyName: name });
      navigate('/companies');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
    setSaving(false);
  }

  if (loading) return <Layout><p>Loading...</p></Layout>;

  return (
    <Layout>
      <h1 className="text-xl font-bold mb-4">Edit Company</h1>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4">{error}</div>}
      <div className="mb-4"><DevFillButton onClick={() => setName('PT BMC Updated Test')} /></div>
      <form onSubmit={handleSubmit} className="max-w-sm">
        <label className="block text-sm font-medium mb-1">Company Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-4"
          required
          disabled={saving}
        />
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate('/companies')} className="px-4 py-2 border text-sm rounded" disabled={saving}>Cancel</button>
          <button type="submit" className="bg-blue-700 text-white px-4 py-2 text-sm rounded hover:bg-blue-800 disabled:opacity-50" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Layout>
  );
}
