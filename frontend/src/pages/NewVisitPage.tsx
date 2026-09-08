import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchCompanies, listCompanies, createCompany } from '../api/companies.api';
import { listVisitors, createVisitor } from '../api/visitors.api';
import { safetyCheck, createVisit, checkDuplicate } from '../api/visits.api';
import { searchEmployees, type Employee } from '../api/hris.api';
import { Layout } from '../components/Layout';
import { type Company } from '../types/company';
import { type Visitor } from '../types/visitor';
import { type SafetyCheckSummary, type VisitorSafetyCheck } from '../types/visit';
import { DevFillButton } from '../components/DevFillButton';

interface SelectedVisitor extends Visitor {
  safetyStatus?: VisitorSafetyCheck;
}

type Step = 1 | 2 | 3 | 4;

export function NewVisitPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [companyQuery, setCompanyQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyResults, setCompanyResults] = useState<Company[]>([]);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [showNewCompany, setShowNewCompany] = useState(false);

  const [hostName, setHostName] = useState('');
  const [hostQuery, setHostQuery] = useState('');
  const [hostResults, setHostResults] = useState<Employee[]>([]);
  const [hostOpen, setHostOpen] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [visitDate, setVisitDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  const [visitors, setVisitors] = useState<SelectedVisitor[]>([]);
  const [visitorSearch, setVisitorSearch] = useState('');
  const [visitorResults, setVisitorResults] = useState<Visitor[]>([]);
  const [visitorSearchOpen, setVisitorSearchOpen] = useState(false);

  const [showNewVisitor, setShowNewVisitor] = useState(false);
  const [newVisitorName, setNewVisitorName] = useState('');
  const [newVisitorPhone, setNewVisitorPhone] = useState('');
  const [duplicateCheck, setDuplicateCheck] = useState<{ strongDuplicate: boolean; potentialMatches: { Id: number; VisitorCode: string; VisitorName: string; CompanyName: string; PhoneNumber: string | null }[] } | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  const [safetyResult, setSafetyResult] = useState<SafetyCheckSummary | null>(null);
  const [safetyResultKey, setSafetyResultKey] = useState<string | null>(null);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const safetyRequestId = useRef(0);
  const safetyStartedKey = useRef<string | null>(null);
  const companySearchRequest = useRef(0);
  const visitorSearchRequest = useRef(0);
  const hostSearchRequest = useRef(0);
  const companySearchTimer = useRef<number | undefined>(undefined);
  const visitorSearchTimer = useRef<number | undefined>(undefined);
  const hostSearchTimer = useRef<number | undefined>(undefined);

  const handleCompanySearch = useCallback(async (q: string) => {
    setCompanyQuery(q);
    setSelectedCompany(null);
    setCompanyOpen(true);
    setShowNewCompany(false);
    if (q.trim().length === 0) {
      setCompanyResults([]);
      return;
    }
    const requestId = ++companySearchRequest.current;
    if (companySearchTimer.current) window.clearTimeout(companySearchTimer.current);
    companySearchTimer.current = window.setTimeout(async () => {
      try {
        const data = await searchCompanies(q);
        if (requestId === companySearchRequest.current) setCompanyResults(data);
      } catch { /* ignore */ }
    }, 300);
  }, []);

  const handleVisitorSearch = useCallback(async (q: string) => {
    setVisitorSearch(q);
    setVisitorSearchOpen(true);
    if (q.trim().length === 0 || !selectedCompany) {
      setVisitorResults([]);
      return;
    }
    const requestId = ++visitorSearchRequest.current;
    if (visitorSearchTimer.current) window.clearTimeout(visitorSearchTimer.current);
    visitorSearchTimer.current = window.setTimeout(async () => {
      try {
        const data = await listVisitors({ q, companyId: selectedCompany.id, active: true });
        const filtered = data.data.filter(v => !visitors.find(sv => sv.id === v.id));
        if (requestId === visitorSearchRequest.current) setVisitorResults(filtered);
      } catch { /* ignore */ }
    }, 300);
  }, [selectedCompany, visitors]);

  const handleHostSearch = useCallback(async (q: string) => {
    setHostQuery(q);
    setHostName(q);
    setHostOpen(true);
    if (q.trim().length < 2) {
      setHostResults([]);
      return;
    }
    const requestId = ++hostSearchRequest.current;
    if (hostSearchTimer.current) window.clearTimeout(hostSearchTimer.current);
    hostSearchTimer.current = window.setTimeout(async () => {
      try {
        const data = await searchEmployees(q);
        if (requestId === hostSearchRequest.current) setHostResults(data);
      } catch {
        setHostResults([]);
      }
    }, 300);
  }, []);

  function handleSelectHost(employee: Employee) {
    setHostName(employee.name);
    setHostQuery(employee.name);
    setHostOpen(false);
    setHostResults([]);
  }

  async function handleCreateCompany() {
    if (!newCompanyName.trim()) return;
    try {
      const company = await createCompany({ companyName: newCompanyName });
      setSelectedCompany(company);
      setCompanyQuery(company.companyName);
      setShowNewCompany(false);
      setNewCompanyName('');
      setCompanyOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create company');
    }
  }

  async function handleCreateVisitor() {
    if (!newVisitorName.trim() || !selectedCompany) return;
    
    setCheckingDuplicate(true);
    try {
      const dupResult = await checkDuplicate({
        visitorName: newVisitorName,
        companyId: selectedCompany.id,
        phoneNumber: newVisitorPhone || undefined,
      });

      setDuplicateCheck(dupResult);

      if (dupResult.strongDuplicate && dupResult.potentialMatches.length > 0) {
        setCheckingDuplicate(false);
        return;
      }

      const result = await createVisitor({
        visitorName: newVisitorName,
        companyId: selectedCompany.id,
        phoneNumber: newVisitorPhone || undefined,
      });

      setVisitors(prev => [...prev, { ...result.visitor, company: selectedCompany }]);
      setShowNewVisitor(false);
      setNewVisitorName('');
      setNewVisitorPhone('');
      setDuplicateCheck(null);
      setVisitorSearch('');
      setVisitorResults([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create visitor');
    }
    setCheckingDuplicate(false);
  }

  async function fillExample() {
    setError('');
    try {
      const companyResponse = await listCompanies({ active: true, limit: 1 });
      const companies = companyResponse.data.length > 0
        ? companyResponse.data
        : await searchCompanies('PT');
      const company = companies[0];
      if (!company) {
        setError('Tidak ada company contoh yang tersedia.');
        return;
      }

      const visitorResponse = await listVisitors({
        companyId: company.id,
        active: true,
        limit: 2,
      });
      let exampleVisitors = visitorResponse.data;
      if (exampleVisitors.length === 0) {
        const suffix = Date.now().toString().slice(-6);
        const createdVisitor = await createVisitor({
          visitorName: `Visitor Development Test ${suffix}`,
          companyId: company.id,
          phoneNumber: `081234${suffix}`,
        });
        exampleVisitors = [{ ...createdVisitor.visitor, company }];
      }

      setSelectedCompany(company);
      setCompanyQuery(company.companyName);
      setCompanyResults(companies);
      setHostName('Hidayah Muhammad Fadillah');
      setHostQuery('Hidayah Muhammad Fadillah');
      setPurpose('Development workflow test');
      setVisitors(exampleVisitors.slice(0, 2));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengisi data contoh');
    }
  }

  function handleSelectExistingVisitor(visitor: Visitor) {
    if (!visitors.find(v => v.id === visitor.id)) {
      setVisitors(prev => [...prev, visitor]);
    }
    setVisitorSearch('');
    setVisitorResults([]);
    setVisitorSearchOpen(false);
  }

  function handleUsePotentialMatch(visitor: { Id: number; VisitorCode: string; VisitorName: string; PhoneNumber: string | null; CompanyName: string }) {
    handleSelectExistingVisitor({
      id: visitor.Id,
      visitorCode: visitor.VisitorCode,
      visitorName: visitor.VisitorName,
      phoneNumber: visitor.PhoneNumber,
      isActive: true,
      createdAt: '',
      updatedAt: null,
      company: { id: selectedCompany!.id, companyName: selectedCompany!.companyName },
    });
    setShowNewVisitor(false);
    setNewVisitorName('');
    setNewVisitorPhone('');
    setDuplicateCheck(null);
  }

  function handleRemoveVisitor(id: number) {
    setVisitors(prev => prev.filter(v => v.id !== id));
  }

  const visitorIdsKey = visitors
    .map((visitor) => visitor.id)
    .sort((a, b) => a - b)
    .join(',');
  const safetyKey = selectedCompany ? `${selectedCompany.id}:${visitorIdsKey}` : '';
  const hasCurrentSafetyResult = Boolean(
    safetyResult && safetyResultKey === safetyKey,
  );

  const runSafetyCheck = useCallback(async (
    companyId: number,
    visitorIds: number[],
    requestKey: string,
    force = false,
  ) => {
    if (!force && safetyStartedKey.current === requestKey) return;

    safetyStartedKey.current = requestKey;
    const requestId = ++safetyRequestId.current;
    setSafetyLoading(true);
    setSafetyResult(null);
    setSafetyResultKey(null);
    try {
      const result = await safetyCheck({
        companyId,
        visitorIds,
      });

      if (requestId !== safetyRequestId.current) return;
      setSafetyResult(result);
      setSafetyResultKey(requestKey);
      
      setVisitors(prev => prev.map(v => {
        const check = result.visitors.find(vc => vc.visitorId === v.id);
        return check ? { ...v, safetyStatus: check } : v;
      }));
    } catch { /* ignore */ }
    finally {
      if (requestId === safetyRequestId.current) setSafetyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedCompany || !visitorIdsKey) {
      safetyStartedKey.current = null;
      setSafetyResult(null);
      setSafetyResultKey(null);
      setSafetyLoading(false);
      return;
    }

    void runSafetyCheck(
      selectedCompany.id,
      visitorIdsKey.split(',').map(Number),
      safetyKey,
    );
  }, [selectedCompany?.id, safetyKey, visitorIdsKey, runSafetyCheck]);

  async function handleCreateVisit() {
    if (!selectedCompany || !hostName || !purpose || !visitDate || visitors.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const visit = await createVisit({
        companyId: selectedCompany.id,
        hostName,
        purpose,
        visitDate,
        visitorIds: visitors.map(v => v.id),
      });
      navigate(`/visits/${visit.Id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create visit');
    }
    setSubmitting(false);
  }

  const canProceedStep1 = selectedCompany && hostName.trim() && purpose.trim() && visitDate;
  const canProceedStep2 = visitors.length > 0;
  const canProceedStep3 = hasCurrentSafetyResult && !safetyLoading;

  function getStatusBadge(status: string) {
    switch (status) {
      case 'VALID':
        return <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">VALID</span>;
      case 'REQUIRED':
        return <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">REQUIRED</span>;
      case 'EXPIRED':
        return <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">EXPIRED</span>;
      default:
        return <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{status}</span>;
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-xl font-bold mb-0">New Visit</h1>
          <DevFillButton onClick={fillExample} />
        </div>

        <div className="flex gap-2 mb-6 text-sm">
          {['Details', 'Visitors', 'Safety Check', 'Review'].map((label, i) => (
            <div key={label} className={`px-3 py-1 rounded ${step === i + 1 ? 'bg-blue-700 text-white' : step > i + 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {i + 1}. {label}
            </div>
          ))}
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4">{error}</div>}

        {step === 1 && (
          <div className="bg-white border rounded p-6">
            <h2 className="font-medium mb-4">Visit Details</h2>
            
            <label htmlFor="new-visit-company" className="block text-sm font-medium mb-1">Perusahaan <span aria-hidden="true">*</span></label>
            <div className="relative mb-4">
              <input
                 id="new-visit-company" type="text"
                value={companyQuery}
                onChange={(e) => handleCompanySearch(e.target.value)}
                placeholder="Search company..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                autoComplete="off"
              />
              {companyOpen && companyResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow max-h-48 overflow-y-auto">
                  {companyResults.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCompany(c);
                        setCompanyQuery(c.companyName);
                        setCompanyOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      {c.companyName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowNewCompany(!showNewCompany)}
                className="text-sm text-blue-700 hover:underline"
              >
                {showNewCompany ? 'Cancel' : '+ Add new company'}
              </button>
              {showNewCompany && (
                <div className="mt-2 flex gap-2">
                   <label htmlFor="new-company-name" className="sr-only">Nama perusahaan baru</label><input
                     id="new-company-name"
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Company name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCompany}
                    className="px-4 py-2 bg-blue-700 text-white text-sm rounded hover:bg-blue-800"
                  >
                    Create
                  </button>
                </div>
              )}
            </div>

             <label htmlFor="new-visit-host" className="block text-sm font-medium mb-1">Host / Orang yang Ditemui <span aria-hidden="true">*</span></label>
            <div className="relative mb-4">
              <input
                 id="new-visit-host" type="text"
                value={hostQuery}
                onChange={(e) => handleHostSearch(e.target.value)}
                onFocus={() => hostQuery.length >= 2 && setHostOpen(true)}
                onBlur={() => setTimeout(() => setHostOpen(false), 150)}
                placeholder="Type employee name..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                autoComplete="off"
              />
              {hostOpen && hostResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow max-h-48 overflow-y-auto">
                  {hostResults.map((employee, idx) => (
                    <button
                      key={`${employee.name}-${idx}`}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleSelectHost(employee); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      {employee.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

             <label htmlFor="new-visit-purpose" className="block text-sm font-medium mb-1">Tujuan Kunjungan <span aria-hidden="true">*</span></label>
            <input
               id="new-visit-purpose" type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-4"
            />

             <label htmlFor="new-visit-date" className="block text-sm font-medium mb-1">Tanggal Kunjungan <span aria-hidden="true">*</span></label>
             <input
               id="new-visit-date" type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-4"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="px-4 py-2 bg-blue-700 text-white text-sm rounded hover:bg-blue-800 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white border rounded p-6">
            <h2 className="font-medium mb-4">Visitors</h2>

            <div className="mb-4">
               <label htmlFor="existing-visitor-search" className="block text-sm font-medium mb-1">Cari Pengunjung Terdaftar</label>
              <input
                 id="existing-visitor-search" type="text"
                value={visitorSearch}
                onChange={(e) => handleVisitorSearch(e.target.value)}
                placeholder="Search by name or code..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                autoComplete="off"
                disabled={!selectedCompany}
              />
              {visitorSearchOpen && visitorResults.length > 0 && (
                <div className="mt-1 bg-white border rounded shadow max-h-48 overflow-y-auto">
                  {visitorResults.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSelectExistingVisitor(v)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      {v.visitorName} ({v.visitorCode})
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowNewVisitor(!showNewVisitor)}
                className="text-sm text-blue-700 hover:underline"
              >
                {showNewVisitor ? 'Cancel' : '+ Add new visitor'}
              </button>
              {showNewVisitor && (
                <div className="mt-2 space-y-2">
                   <label htmlFor="new-visitor-name" className="sr-only">Nama pengunjung baru</label><input
                     id="new-visitor-name"
                    type="text"
                    value={newVisitorName}
                    onChange={(e) => { setNewVisitorName(e.target.value); setDuplicateCheck(null); }}
                    placeholder="Visitor name"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                   <label htmlFor="new-visitor-phone" className="sr-only">Nomor telepon pengunjung baru</label><input
                     id="new-visitor-phone"
                    type="text"
                    value={newVisitorPhone}
                    onChange={(e) => setNewVisitorPhone(e.target.value)}
                    placeholder="Phone (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />

                  {duplicateCheck && duplicateCheck.potentialMatches.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
                      <p className="font-medium text-amber-800 mb-2">
                        {duplicateCheck.strongDuplicate ? 'Visitor already exists:' : 'Possible existing visitor:'}
                      </p>
                      {duplicateCheck.potentialMatches.map(m => (
                        <div key={m.Id} className="flex items-center gap-2 mb-2">
                          <span className="font-mono text-xs">{m.VisitorCode}</span>
                          <span>{m.VisitorName}</span>
                          <button
                            type="button"
                            onClick={() => handleUsePotentialMatch(m)}
                            className="text-xs text-blue-700 hover:underline"
                          >
                            Use Existing
                          </button>
                        </div>
                      ))}
                      {!duplicateCheck.strongDuplicate && (
                        <button
                          type="button"
                          onClick={handleCreateVisitor}
                          disabled={checkingDuplicate}
                          className="text-xs text-gray-600 hover:underline"
                        >
                          Create New Anyway
                        </button>
                      )}
                    </div>
                  )}

                  {(!duplicateCheck || duplicateCheck.potentialMatches.length === 0) && (
                    <button
                      type="button"
                      onClick={handleCreateVisitor}
                      disabled={checkingDuplicate || !newVisitorName.trim()}
                      className="px-4 py-2 bg-blue-700 text-white text-sm rounded hover:bg-blue-800 disabled:opacity-50"
                    >
                      {checkingDuplicate ? 'Checking...' : 'Add Visitor'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {visitors.length > 0 && (
              <div className="space-y-2 mb-4">
                {visitors.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium">{v.visitorName}</p>
                      <p className="text-xs text-gray-500">{v.visitorCode} · {v.company?.companyName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {v.safetyStatus && getStatusBadge(v.safetyStatus.status)}
                      <button
                        type="button"
                        onClick={() => handleRemoveVisitor(v.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(1)} className="px-4 py-2 border text-sm rounded">Back</button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
                className="px-4 py-2 bg-blue-700 text-white text-sm rounded hover:bg-blue-800 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white border rounded p-6">
            <h2 className="font-medium mb-4">Safety Induction Check</h2>

            {safetyLoading ? (
              <p className="text-sm text-gray-500">Checking safety status...</p>
            ) : hasCurrentSafetyResult && safetyResult ? (
              <>
                <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
                  <p>{safetyResult.summary.totalVisitors} visitors · {safetyResult.summary.cleared} cleared · {safetyResult.summary.requiresInduction} require induction</p>
                </div>

                <div className="space-y-2 mb-4">
                  {safetyResult.visitors.map(v => (
                    <div key={v.visitorId} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="text-sm font-medium">{v.visitorName}</p>
                        {v.reason && (
                          <p className="text-xs text-gray-500">
                            {v.reason === 'NEVER_COMPLETED' && 'Never completed'}
                            {v.reason === 'EXPIRED' && v.validUntil && `Expired ${new Date(v.validUntil).toLocaleDateString()}`}
                            {v.reason === 'NEW_VERSION_REQUIRED' && 'New version required'}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(v.status)}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between">
                  <button type="button" onClick={() => setStep(2)} className="px-4 py-2 border text-sm rounded">Back</button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    disabled={!canProceedStep3}
                    className="px-4 py-2 bg-blue-700 text-white text-sm rounded hover:bg-blue-800 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <button type="button" onClick={() => setStep(2)} className="px-4 py-2 border text-sm rounded">Back</button>
                <button
                  type="button"
                  onClick={() => selectedCompany && void runSafetyCheck(
                    selectedCompany.id,
                    visitors.map((visitor) => visitor.id),
                    safetyKey,
                    true,
                  )}
                  className="px-4 py-2 bg-blue-700 text-white text-sm rounded hover:bg-blue-800"
                >
                  Run Check
                </button>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="bg-white border rounded p-6">
            <h2 className="font-medium mb-4">Review</h2>

            <div className="space-y-3 mb-6 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Company</p>
                <p className="font-medium">{selectedCompany?.companyName}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Host</p>
                <p className="font-medium">{hostName}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Purpose</p>
                <p className="font-medium">{purpose}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Date</p>
                <p className="font-medium">{new Date(visitDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Visitors ({visitors.length})</p>
                <div className="mt-1 space-y-1">
                  {visitors.map(v => (
                    <div key={v.id} className="flex items-center justify-between">
                      <span>{v.visitorName}</span>
                      {v.safetyStatus && getStatusBadge(v.safetyStatus.status)}
                    </div>
                  ))}
                </div>
              </div>
              {safetyResult && (
                <div>
                  <p className="text-gray-500 text-xs">Safety Summary</p>
                  <p className="font-medium">
                    {safetyResult.summary.cleared} Valid · {safetyResult.summary.required} Required · {safetyResult.summary.expired} Expired
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(3)} className="px-4 py-2 border text-sm rounded">Back</button>
              <button
                type="button"
                onClick={handleCreateVisit}
                disabled={submitting}
                className="px-4 py-2 bg-blue-700 text-white text-sm rounded hover:bg-blue-800 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Visit'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
