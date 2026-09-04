import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCompany } from '../api/companies.api';
import { Layout } from '../components/Layout';

export function AddCompanyPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createCompany({ companyName: name });
      navigate('/companies');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create company');
    }
    setLoading(false);
  }

  return (
    <Layout>
      <h1 className="text-xl font-bold mb-4">Add Company</h1>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="max-w-sm">
        <label className="block text-sm font-medium mb-1">Company Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-4"
          required
          disabled={loading}
        />
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate('/companies')} className="px-4 py-2 border text-sm rounded" disabled={loading}>Cancel</button>
          <button type="submit" className="bg-blue-700 text-white px-4 py-2 text-sm rounded hover:bg-blue-800 disabled:opacity-50" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Layout>
  );
}
