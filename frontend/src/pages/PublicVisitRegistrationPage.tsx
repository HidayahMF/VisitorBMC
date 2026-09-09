import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerPublicVisit } from '../api/safety-inductions.api';
import { listPublicEmployees, searchPublicEmployees, type Employee } from '../api/hris.api';
import { createPublicCompany, listPublicCompanies } from '../api/companies.api';
import { type Company } from '../types/company';
import { DevFillButton } from '../components/DevFillButton';
import { searchPublicVisitors, type PublicVisitorMatch } from '../api/visitors.api';

interface VisitorDraft { name: string; phoneNumber: string }

export function PublicVisitRegistrationPage() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [companyResults, setCompanyResults] = useState<Company[]>([]);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [hostName, setHostName] = useState('');
  const [hostResults, setHostResults] = useState<Employee[]>([]);
  const [hostOpen, setHostOpen] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [visitors, setVisitors] = useState<VisitorDraft[]>([]);
  const [visitorSearch, setVisitorSearch] = useState('');
  const [visitorMatches, setVisitorMatches] = useState<PublicVisitorMatch[]>([]);
  const [visitorSearchOpen, setVisitorSearchOpen] = useState(false);
  const [showNewVisitor, setShowNewVisitor] = useState(false);
  const [newVisitorName, setNewVisitorName] = useState('');
  const [newVisitorPhone, setNewVisitorPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const hostSearchTimer = useRef<number | undefined>(undefined);
  const visitorSearchTimer = useRef<number | undefined>(undefined);
  const companyFieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void listPublicCompanies().then(setCompanyResults).catch(() => setCompanyResults([]));
  }, []);

  useEffect(() => () => {
    if (hostSearchTimer.current) window.clearTimeout(hostSearchTimer.current);
    if (visitorSearchTimer.current) window.clearTimeout(visitorSearchTimer.current);
  }, []);

  const selectedCompanyId = companyResults.find((company) => company.companyName === companyName)?.id;

  useEffect(() => {
    function closeCompanyMenu(event: MouseEvent) {
      if (companyFieldRef.current && !companyFieldRef.current.contains(event.target as Node)) setCompanyOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setCompanyOpen(false);
        setVisitorSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', closeCompanyMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeCompanyMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  function handleHostChange(value: string) {
    setHostName(value);
    setHostOpen(true);
    if (hostSearchTimer.current) window.clearTimeout(hostSearchTimer.current);
    if (value.trim().length < 2) {
      setHostResults([]);
      return;
    }
    hostSearchTimer.current = window.setTimeout(async () => {
      try {
        setHostResults(await searchPublicEmployees(value));
      } catch {
        setHostResults([]);
      }
    }, 250);
  }

  function selectHost(employee: Employee) {
    setHostName(employee.name);
    setHostOpen(false);
    setHostResults([]);
  }

  function selectCompany(company: Company) {
    setCompanyName(company.companyName);
    setCompanyOpen(false);
  }

  async function handleCreateCompany() {
    if (!newCompanyName.trim() || creatingCompany) return;
    setCreatingCompany(true);
    setError('');
    try {
      const company = await createPublicCompany({ companyName: newCompanyName });
      setCompanyResults((current) => [company, ...current.filter((item) => item.id !== company.id)]);
      setCompanyName(company.companyName);
      setNewCompanyName('');
      setShowNewCompany(false);
      setCompanyOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal membuat perusahaan.');
    } finally {
      setCreatingCompany(false);
    }
  }

  async function fillExample() {
    try {
      const companies = companyResults.length > 0 ? companyResults : await listPublicCompanies();
      const company = companies[0];
      if (!company) {
        setError('Belum ada perusahaan aktif di master data.');
        return;
      }
      const employees = await listPublicEmployees(50);
      const host = employees[0];
      setCompanyName(company.companyName);
      setCompanyOpen(false);
      setHostName(host?.name ?? '');
      setHostOpen(false);
      setHostResults([]);
      setPurpose('Meeting development test');
      setVisitors([
        { name: 'Visitor Development Test 1', phoneNumber: '081234567890' },
        { name: 'Visitor Development Test 2', phoneNumber: '081234567891' },
      ]);
      if (!host) setError('Perusahaan terisi, tetapi data host HRIS belum ditemukan.');
    } catch {
      setError('Gagal mengambil data contoh dari master perusahaan atau HRIS.');
    }
  }

  function handleVisitorSearch(value: string) {
    setVisitorSearch(value);
    setVisitorSearchOpen(true);
    if (visitorSearchTimer.current) window.clearTimeout(visitorSearchTimer.current);
    if (!selectedCompanyId || value.trim().length < 2) {
      setVisitorMatches([]);
      return;
    }
    visitorSearchTimer.current = window.setTimeout(async () => {
      try {
        const matches = await searchPublicVisitors(value, selectedCompanyId);
        setVisitorMatches(matches);
      } catch {
        setVisitorMatches([]);
      }
    }, 250);
  }

  function selectExistingVisitor(match: PublicVisitorMatch) {
    if (!visitors.some((visitor) => visitor.name.toLowerCase() === match.VisitorName.toLowerCase())) {
      setVisitors((current) => [...current, { name: match.VisitorName, phoneNumber: match.PhoneNumber ?? '' }]);
    }
    setVisitorSearch('');
    setVisitorMatches([]);
    setVisitorSearchOpen(false);
  }

  function addVisitor() {
    if (!newVisitorName.trim() || visitors.length >= 20) return;
    setVisitors((current) => [...current, { name: newVisitorName.trim(), phoneNumber: newVisitorPhone.trim() }]);
    setNewVisitorName('');
    setNewVisitorPhone('');
    setShowNewVisitor(false);
    setVisitorSearch('');
    setVisitorSearchOpen(false);
  }

  function removeVisitor(index: number) {
    if (visitors.length > 1) setVisitors((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await registerPublicVisit({ companyName, hostName, purpose, visitors });
      navigate(`/safety-induction/${result.token}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Registrasi gagal. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="public-visit-shell">
      <div className="public-visit-page">
        <header className="page-header-compact public-visit-header">
          <div>
            <p className="page-eyebrow">Visitor registration</p>
            <h1>Registrasi Kunjungan</h1>
            <p>Isi data satu grup visitor. Tidak perlu membuat akun atau login.</p>
          </div>
          <div className="public-visit-header-actions"><DevFillButton label="Isi data contoh" onClick={fillExample} /><button type="button" className="public-back-button" onClick={() => navigate('/login')}>Kembali ke Login</button></div>
        </header>
        <div className="public-visit-steps" aria-label="Tahapan registrasi">
          <span className="is-active"><b>1</b> Data kunjungan</span><span><b>2</b> Safety Induction</span><span><b>3</b> Check-in otomatis</span>
        </div>
        <form onSubmit={handleSubmit} className="public-visit-form">
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <section className="public-form-section">
            <div className="public-form-section-heading"><div><h2>Informasi kunjungan</h2><p>Masukkan perusahaan dan karyawan BMC yang dituju.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative" ref={companyFieldRef}>
              <label className="text-sm font-medium" htmlFor="public-company">Perusahaan visitor</label>
              <input id="public-company" className="public-form-input mt-1 w-full" value={companyName} onChange={(event) => { setCompanyName(event.target.value); setCompanyOpen(true); }} onFocus={() => setCompanyOpen(true)} placeholder="Pilih perusahaan dari daftar" autoComplete="off" required />
              {companyOpen && <div className="public-host-results" role="listbox">
                {companyResults.filter((company) => company.companyName.toLowerCase().includes(companyName.toLowerCase())).map((company) => <button key={company.id} type="button" className="public-host-option" onMouseDown={(event) => event.preventDefault()} onClick={() => selectCompany(company)}>{company.companyName}</button>)}
                <button type="button" className="public-host-option public-create-option" onMouseDown={(event) => event.preventDefault()} onClick={() => { setShowNewCompany(true); setCompanyOpen(false); }}><strong>+ Buat perusahaan baru</strong><span>Jika belum ada di daftar perusahaan BMC</span></button>
              </div>}
              {showNewCompany && <div className="public-new-company"><label className="text-sm font-medium" htmlFor="new-public-company">Nama perusahaan baru</label><div className="public-new-company-row"><input id="new-public-company" className="public-form-input" value={newCompanyName} onChange={(event) => setNewCompanyName(event.target.value)} placeholder="Contoh: PT Contoh Indonesia" autoFocus /><button type="button" className="px-3 py-2 bg-blue-700 text-white text-sm rounded disabled:opacity-50" onClick={() => void handleCreateCompany()} disabled={!newCompanyName.trim() || creatingCompany}>{creatingCompany ? 'Menyimpan...' : 'Simpan'}</button><button type="button" className="public-cancel-button" onClick={() => { setShowNewCompany(false); setNewCompanyName(''); }}>Batal</button></div></div>}
              <p className="mt-1 text-xs text-slate-500">Pilih perusahaan dari master BMC. Klik di luar atau tekan Esc untuk menutup daftar.</p>
            </div>
            <div className="relative">
              <label className="text-sm font-medium" htmlFor="public-host">Host / karyawan tujuan</label>
              <input id="public-host" className="public-form-input mt-1 w-full" value={hostName} onChange={(event) => handleHostChange(event.target.value)} onFocus={() => setHostOpen(hostResults.length > 0)} placeholder="Ketik nama karyawan" autoComplete="off" required />
              {hostOpen && hostResults.length > 0 && <div className="public-host-results" role="listbox">{hostResults.map((employee) => <button key={employee.username} type="button" className="public-host-option" onMouseDown={(event) => event.preventDefault()} onClick={() => selectHost(employee)}><strong>{employee.name}</strong></button>)}</div>}
            </div>
          </div>
          <label className="block text-sm font-medium">Tujuan kunjungan<textarea className="public-form-input mt-1 w-full" rows={3} value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="Contoh: meeting, audit, atau pengiriman barang" required /></label>
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="font-semibold">Daftar visitor</h2><p className="text-xs text-slate-500">Cari nama yang sudah terdaftar. Jika belum ada, gunakan tombol tambah visitor.</p></div><button type="button" onClick={() => setShowNewVisitor((current) => !current)} className="text-sm font-semibold text-blue-700" disabled={!selectedCompanyId || visitors.length >= 20}>{showNewVisitor ? 'Batal tambah' : '+ Tambah visitor'}</button></div>
            <div className="relative mb-3"><input className="public-form-input w-full" value={visitorSearch} onChange={(event) => handleVisitorSearch(event.target.value)} onFocus={() => setVisitorSearchOpen(visitorMatches.length > 0)} placeholder={selectedCompanyId ? 'Ketik minimal 2 karakter nama visitor' : 'Pilih perusahaan terlebih dahulu'} disabled={!selectedCompanyId} autoComplete="off" />
              {visitorSearchOpen && visitorMatches.length > 0 && <div className="public-host-results" role="listbox">{visitorMatches.map((match) => <button key={match.Id} type="button" className="public-host-option" onMouseDown={(event) => event.preventDefault()} onClick={() => selectExistingVisitor(match)}><strong>{match.VisitorName}</strong><span>{match.VisitorCode}</span></button>)}</div>}
            </div>
            {showNewVisitor && <div className="public-new-company mb-3"><div className="grid gap-2 sm:grid-cols-[1fr_180px_auto]"><input className="public-form-input" value={newVisitorName} onChange={(event) => setNewVisitorName(event.target.value)} placeholder="Nama visitor baru" autoFocus /><input className="public-form-input" value={newVisitorPhone} onChange={(event) => setNewVisitorPhone(event.target.value)} placeholder="Nomor HP (opsional)" /><button type="button" className="px-3 py-2 bg-blue-700 text-white text-sm rounded disabled:opacity-50" onClick={addVisitor} disabled={!newVisitorName.trim()}>Tambah</button></div></div>}
            <div className="space-y-3">
              {visitors.map((visitor, index) => <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_180px_auto]">
                <div><p className="text-sm font-medium">{visitor.name}</p><p className="text-xs text-slate-500">Visitor {index + 1}</p></div>
                <p className="self-center text-sm text-slate-600">{visitor.phoneNumber || 'Nomor HP tidak diisi'}</p>
                <button type="button" onClick={() => removeVisitor(index)} className="text-left text-sm text-red-600">Hapus</button>
              </div>)}
            </div>
          </section>
          <div className="public-form-footer"><p>Setelah Safety Induction disubmit, grup langsung tercatat <strong>IN</strong>. Checkout dilakukan oleh Security.</p><button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-700 text-white text-sm rounded hover:bg-blue-800 disabled:opacity-50">{submitting ? 'Menyimpan...' : 'Lanjut ke Safety Induction'}</button></div>
        </form>
      </div>
    </main>
  );
}
