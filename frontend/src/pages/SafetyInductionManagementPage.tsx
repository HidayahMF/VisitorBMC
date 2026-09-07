import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { DevFillButton } from '../components/DevFillButton';
import {
  deleteInductionContent,
  listManagedInductionContents,
  updateInductionContentStatus,
  uploadInductionContent,
} from '../api/safety-inductions.api';
import { type InductionContent } from '../types/induction';

export function SafetyInductionManagementPage() {
  const [contents, setContents] = useState<InductionContent[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      setContents(await listManagedInductionContents());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat konten');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setSaving(true);
    setError('');
    try {
      await uploadInductionContent({ file, title, description });
      setFile(null);
      setTitle('');
      setDescription('');
      const input = document.getElementById('content-file') as HTMLInputElement | null;
      if (input) input.value = '';
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengupload konten');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(content: InductionContent) {
    try {
      await updateInductionContentStatus(content.Id, !content.IsActive);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah status konten');
    }
  }

  async function handleDelete(content: InductionContent) {
    if (!confirm(`Hapus konten "${content.Title || content.ContentUrl}"?`)) return;
    try {
      await deleteInductionContent(content.Id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus konten');
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="dashboard-kicker">Configuration</p>
          <h1 className="text-xl font-bold mb-1">Safety Induction Content</h1>
          <p className="text-sm text-gray-500">Pilih konten yang akan dilihat visitor.</p>
        </div>
        <DevFillButton onClick={() => { setTitle('Safety Content Development'); setDescription('Development content'); }} label="Isi contoh" />
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4">{error}</div>}

      <form onSubmit={handleUpload} className="bg-white border rounded p-5 mb-5">
        <h2 className="font-medium mb-4">Upload Content</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            id="content-file"
            type="file"
            accept="video/*,image/*,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="text-sm"
            required
          />
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Judul konten" className="px-3 py-2 border rounded text-sm" />
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Deskripsi (opsional)" className="px-3 py-2 border rounded text-sm" />
        </div>
        <button type="submit" disabled={!file || saving} className="mt-4 bg-blue-700 text-white text-sm px-4 py-2 rounded disabled:opacity-40">
          {saving ? 'Uploading...' : 'Upload Content'}
        </button>
        <p className="text-xs text-gray-400 mt-2">Video besar diputar dengan streaming. Konten baru nonaktif sampai dipilih.</p>
      </form>

      {loading ? <p className="text-sm text-gray-500">Loading...</p> : (
        <div className="space-y-3">
          {contents.map((content) => (
            <div key={content.Id} className="bg-white border rounded p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <strong className="text-sm truncate">{content.Title || content.ContentUrl}</strong>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{content.ContentType}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${content.IsActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {content.IsActive ? 'Shown' : 'Hidden'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">{content.Description || content.ContentUrl}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => void handleToggle(content)} className="text-xs px-3 py-1 border rounded hover:bg-gray-50">
                  {content.IsActive ? 'Hide' : 'Show'}
                </button>
                <button type="button" onClick={() => void handleDelete(content)} className="text-xs px-3 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50">
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!contents.length && <p className="text-sm text-gray-400">Belum ada konten.</p>}
        </div>
      )}
    </Layout>
  );
}
