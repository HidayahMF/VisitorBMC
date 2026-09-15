import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerPublicVisit } from '../api/safety-inductions.api';
import { searchPublicEmployees, type Employee } from '../api/hris.api';
import { createPublicCompany, listPublicCompanies } from '../api/companies.api';
import { type Company } from '../types/company';
import { DevFillButton } from '../components/DevFillButton';
import { searchPublicVisitors, type PublicVisitorMatch } from '../api/visitors.api';
import { useLanguage } from '../i18n/LanguageContext';

interface VisitorDraft { name: string; phoneNumber: string }

export function PublicVisitRegistrationPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
  const [purposeCategory, setPurposeCategory] = useState<'MEETING' | 'TECHNICAL_SUPPORT' | ''>('');
  const [visitors, setVisitors] = useState<VisitorDraft[]>([]);
  const [visitorSearch, setVisitorSearch] = useState('');
  const [visitorMatches, setVisitorMatches] = useState<PublicVisitorMatch[]>([]);
  const [visitorSearching, setVisitorSearching] = useState(false);
  const [visitorSearchOpen, setVisitorSearchOpen] = useState(false);
  const [showNewVisitor, setShowNewVisitor] = useState(false);
  const [newVisitorName, setNewVisitorName] = useState('');
  const [newVisitorPhone, setNewVisitorPhone] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const hostSearchTimer = useRef<number | undefined>(undefined);
  const visitorSearchTimer = useRef<number | undefined>(undefined);
  const companyFieldRef = useRef<HTMLDivElement>(null);
  const companySearchRequest = useRef(0);

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

  function handleCompanyChange(value: string) {
    setCompanyName(value);
    setCompanyOpen(true);
    const requestId = ++companySearchRequest.current;
    void listPublicCompanies(100, value.trim() || undefined)
      .then((companies) => {
        if (requestId === companySearchRequest.current) setCompanyResults(companies);
      })
      .catch(() => {
        if (requestId === companySearchRequest.current) setCompanyResults([]);
      });
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
       const brajaCompanies = await listPublicCompanies(100, 'Braja Mukti Cakra');
       const targetCompany = brajaCompanies.find((item) => item.companyName.toLowerCase().includes('braja mukti cakra'));
       if (!targetCompany) {
         setError('Perusahaan Braja Mukti Cakra belum tersedia di master data.');
         return;
       }
       const host = 'Hidayah Muhammad Fadillah';
       setCompanyResults((current) => [
         targetCompany,
         ...current.filter((item) => item.id !== targetCompany.id),
       ]);
       setCompanyName(targetCompany.companyName);
      setCompanyOpen(false);
       setHostName(host);
      setHostOpen(false);
      setHostResults([]);
       setPurpose('Meeting development test');
       setPurposeCategory('MEETING');
       setVisitors([
         { name: 'Pengunjung Test 1', phoneNumber: '' },
         { name: 'Pengunjung Test 2', phoneNumber: '' },
       ]);
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
      setVisitorSearching(false);
      return;
    }
    setVisitorSearching(true);
    visitorSearchTimer.current = window.setTimeout(async () => {
      try {
        const matches = await searchPublicVisitors(value, selectedCompanyId);
        setVisitorMatches(matches);
      } catch {
        setVisitorMatches([]);
      } finally {
        setVisitorSearching(false);
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

  function startNewVisitor() {
    setNewVisitorName(visitorSearch.trim());
    setShowNewVisitor(true);
    setVisitorSearchOpen(false);
  }

  function removeVisitor(index: number) {
    if (visitors.length > 1) setVisitors((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!companyName || !selectedCompanyId) nextErrors.company = t('publicRegistration.companyRequired');
    if (!hostName.trim()) nextErrors.host = t('publicRegistration.hostRequired');
    if (!purpose.trim()) nextErrors.purpose = t('publicRegistration.purposeRequired');
    if (!purposeCategory) nextErrors.purposeCategory = 'Kategori keperluan kunjungan wajib dipilih.';
    if (visitors.length === 0) nextErrors.visitors = t('publicRegistration.visitorsRequired');
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitting(true);
    setError('');
    try {
       const result = await registerPublicVisit({ companyName, hostName, purpose, purposeCategory, visitors });
       if (result.token) navigate(`/safety-induction/${result.token}`);
       else setError(`Registrasi kunjungan ${result.visitCode} berhasil. Tidak ada konten Safety Induction aktif untuk kategori ini.`);
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
            <p className="page-eyebrow">{t('publicRegistration.eyebrow')}</p>
            <h1>{t('publicRegistration.title')}</h1>
            <p>{t('publicRegistration.description')}</p>
            <p className="public-visit-preparation">{t('publicRegistration.preparation')}</p>
          </div>
          <div className="public-visit-header-actions"><DevFillButton label={t('publicRegistration.devFill')} onClick={fillExample} /><button type="button" className="public-back-button" onClick={() => navigate('/login')}>{t('publicRegistration.staffLogin')}</button></div>
        </header>
          <div className="public-visit-steps" aria-label={t('publicRegistration.stepsLabel')}>
           <span className="is-active"><b>1</b> {t('publicRegistration.stepVisit')}</span><span><b>2</b> {t('publicRegistration.stepInduction')}</span><span><b>3</b> {t('publicRegistration.stepCheckIn')}</span>
        </div>
        <form onSubmit={handleSubmit} className="public-visit-form">
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <section className="public-form-section">
             <div className="public-form-section-heading"><div><h2>{t('publicRegistration.visitInformation')}</h2><p>{t('publicRegistration.visitInformationDescription')}</p></div></div>
             <p className="public-required-note">{t('publicRegistration.requiredNote')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative" ref={companyFieldRef}>
               <label className="text-sm font-medium" htmlFor="public-company">{t('publicRegistration.companyLabel')} *</label>
               <input id="public-company" className="public-form-input mt-1 w-full" value={companyName} onChange={(event) => handleCompanyChange(event.target.value)} onFocus={() => setCompanyOpen(true)} placeholder={t('publicRegistration.companyPlaceholder')} autoComplete="off" required aria-invalid={Boolean(fieldErrors.company)} aria-describedby="public-company-help public-company-error" />
              {companyOpen && <div className="public-host-results" role="listbox">
                {companyResults.filter((company) => company.companyName.toLowerCase().includes(companyName.toLowerCase())).map((company) => <button key={company.id} type="button" className="public-host-option" onMouseDown={(event) => event.preventDefault()} onClick={() => selectCompany(company)}>{company.companyName}</button>)}
                <button type="button" className="public-host-option public-create-option" onMouseDown={(event) => event.preventDefault()} onClick={() => { setShowNewCompany(true); setCompanyOpen(false); }}><strong>+ Buat perusahaan baru</strong><span>Jika belum ada di daftar perusahaan BMC</span></button>
              </div>}
              {showNewCompany && <div className="public-new-company"><label className="text-sm font-medium" htmlFor="new-public-company">Nama perusahaan baru</label><div className="public-new-company-row"><input id="new-public-company" className="public-form-input" value={newCompanyName} onChange={(event) => setNewCompanyName(event.target.value)} placeholder="Contoh: PT Contoh Indonesia" autoFocus /><button type="button" className="px-3 py-2 bg-blue-700 text-white text-sm rounded disabled:opacity-50" onClick={() => void handleCreateCompany()} disabled={!newCompanyName.trim() || creatingCompany}>{creatingCompany ? 'Menyimpan...' : 'Simpan'}</button><button type="button" className="public-cancel-button" onClick={() => { setShowNewCompany(false); setNewCompanyName(''); }}>Batal</button></div></div>}
               <p id="public-company-help" className="mt-1 text-xs text-slate-500">{t('publicRegistration.companyHelper')}</p>{fieldErrors.company && <p id="public-company-error" className="public-field-error" role="alert">{fieldErrors.company}</p>}
            </div>
            <div className="relative">
               <label className="text-sm font-medium" htmlFor="public-host">{t('publicRegistration.hostLabel')} *</label>
               <input id="public-host" className="public-form-input mt-1 w-full" value={hostName} onChange={(event) => handleHostChange(event.target.value)} onFocus={() => setHostOpen(hostResults.length > 0)} placeholder={t('publicRegistration.hostPlaceholder')} autoComplete="off" required aria-invalid={Boolean(fieldErrors.host)} aria-describedby="public-host-help public-host-error" />
               <p id="public-host-help" className="mt-1 text-xs text-slate-500">{t('publicRegistration.hostHelper')}</p>{fieldErrors.host && <p id="public-host-error" className="public-field-error" role="alert">{fieldErrors.host}</p>}
              {hostOpen && hostResults.length > 0 && <div className="public-host-results" role="listbox">{hostResults.map((employee) => <button key={employee.username} type="button" className="public-host-option" onMouseDown={(event) => event.preventDefault()} onClick={() => selectHost(employee)}><strong>{employee.name}</strong></button>)}</div>}
            </div>
          </div>
            <label className="block text-sm font-medium" htmlFor="public-purpose">{t('publicRegistration.purposeLabel')} *<textarea id="public-purpose" className="public-form-input mt-1 w-full" rows={3} value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder={t('publicRegistration.purposePlaceholder')} required aria-invalid={Boolean(fieldErrors.purpose)} aria-describedby="public-purpose-help public-purpose-error" /></label><p id="public-purpose-help" className="public-field-help">{t('publicRegistration.purposeHelper')}</p>{fieldErrors.purpose && <p id="public-purpose-error" className="public-field-error" role="alert">{fieldErrors.purpose}</p>}
            <label className="block text-sm font-medium mt-4" htmlFor="public-purpose-category">Kategori Keperluan Kunjungan *<select id="public-purpose-category" className="public-form-input mt-1 w-full" value={purposeCategory} onChange={(event) => setPurposeCategory(event.target.value as 'MEETING' | 'TECHNICAL_SUPPORT' | '')} required><option value="">Pilih kategori...</option><option value="MEETING">Meeting</option><option value="TECHNICAL_SUPPORT">Technical Support (Teknisi)</option></select></label>{fieldErrors.purposeCategory && <p className="public-field-error" role="alert">{fieldErrors.purposeCategory}</p>}
          </section>
           <section aria-labelledby="public-visitors-title">
              <div className="mb-3 flex items-start justify-between gap-3"><div><h2 id="public-visitors-title" className="font-semibold">{t('publicRegistration.visitorInformation')}</h2><p className="text-xs text-slate-500">{t('publicRegistration.visitorInformationDescription')}</p></div><button type="button" onClick={() => setShowNewVisitor((current) => !current)} className="text-sm font-semibold text-blue-700" disabled={!selectedCompanyId || visitors.length >= 20}>{showNewVisitor ? t('publicRegistration.cancelAdd') : `+ ${t('publicRegistration.addNewVisitor')}`}</button></div>
             <div className="relative mb-3"><label className="public-field-label" htmlFor="public-visitor-search">{t('publicRegistration.visitorSearchLabel')}</label><input id="public-visitor-search" className="public-form-input mt-1 w-full" value={visitorSearch} onChange={(event) => handleVisitorSearch(event.target.value)} onFocus={() => setVisitorSearchOpen(visitorMatches.length > 0)} placeholder={selectedCompanyId ? t('publicRegistration.visitorSearchPrompt') : t('publicRegistration.selectCompanyFirst')} disabled={!selectedCompanyId} autoComplete="off" aria-describedby="public-visitor-help" />
               {visitorSearchOpen && visitorMatches.length > 0 && <div className="public-host-results" role="listbox">{visitorMatches.map((match) => <button key={match.Id} type="button" className="public-host-option" onMouseDown={(event) => event.preventDefault()} onClick={() => selectExistingVisitor(match)}><strong>{match.VisitorName}</strong><span>{match.VisitorCode}</span></button>)}</div>}
             </div><p id="public-visitor-help" className="public-field-help">{selectedCompanyId ? (visitorSearch.trim().length < 2 ? t('publicRegistration.visitorSearchInitial') : visitorSearching ? t('publicRegistration.visitorSearchLoading') : visitorMatches.length > 0 ? t('publicRegistration.visitorSearchFound') : t('publicRegistration.visitorSearchHelper')) : t('publicRegistration.selectCompanyFirst')}</p>{!visitorSearching && selectedCompanyId && visitorSearch.trim().length >= 2 && visitorMatches.length === 0 && <div className="public-visitor-no-result"><strong>{t('publicRegistration.noVisitorFound')}</strong><span>{t('publicRegistration.noVisitorFoundDescription')}</span></div>}{fieldErrors.visitors && <p className="public-field-error" role="alert">{fieldErrors.visitors}</p>}
             {showNewVisitor && <div className="public-new-company mb-3"><div className="grid gap-2 sm:grid-cols-[1fr_180px_auto]"><input className="public-form-input" value={newVisitorName} onChange={(event) => setNewVisitorName(event.target.value)} placeholder={t('publicRegistration.newVisitorName')} autoFocus /><input className="public-form-input" value={newVisitorPhone} onChange={(event) => setNewVisitorPhone(event.target.value)} placeholder={t('publicRegistration.newVisitorPhone')} /><button type="button" className="px-3 py-2 bg-blue-700 text-white text-sm rounded disabled:opacity-50" onClick={addVisitor} disabled={!newVisitorName.trim()}>{t('publicRegistration.add')}</button></div></div>}
              {visitors.length === 0 && visitorSearch.trim().length < 2 && <div className="public-visitor-empty"><strong>{t('publicRegistration.noVisitors')}</strong><span>{t('publicRegistration.noVisitorsHelper')}</span><span>{t('publicRegistration.visitorSearchInitial')}</span></div>}
              {visitors.length > 0 && <h3 className="public-added-visitors-title">{t('publicRegistration.addedVisitors')}</h3>}
              <div className="space-y-3">
               {visitors.map((visitor, index) => <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_180px_auto]">
                 <div><p className="text-sm font-medium">{visitor.name}</p><p className="text-xs text-slate-500">{t('publicRegistration.visitorNumber')} {index + 1}</p></div>
                 <p className="self-center text-sm text-slate-600">{visitor.phoneNumber || t('publicRegistration.phoneNotProvided')}</p>
                 <button type="button" onClick={() => removeVisitor(index)} className="text-left text-sm text-red-600">{t('publicRegistration.remove')}</button>
              </div>)}
            </div>
          </section>
           <div className="public-form-footer"><p>{t('publicRegistration.nextStep')}</p><button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-700 text-white text-sm rounded hover:bg-blue-800 disabled:opacity-50">{submitting ? t('publicRegistration.saving') : t('publicRegistration.continue')}</button></div>
        </form>
      </div>
    </main>
  );
}
