import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listVisits } from '../api/visits.api';
import { listCompanies } from '../api/companies.api';
import { Layout } from '../components/Layout';
import { type Visit, type VisitStatus } from '../types/visit';
import { type Company } from '../types/company';
import { ErrorState, EmptyState } from '../components/AsyncState';
import { useLanguage } from '../i18n/LanguageContext';
import { userFacingError } from '../api/client';
import { visitStatusLabel } from '../utils/visit-status';

export function VisitsPage() {
  const navigate = useNavigate();
  const { language, t, formatDate } = useLanguage();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState<number | undefined>();
  const [filterStatus, setFilterStatus] = useState<VisitStatus | ''>('');
  const [filterDate, setFilterDate] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { void loadCompanies(); }, []);
  useEffect(() => { void load(); }, [search, filterCompany, filterStatus, filterDate, page]);

  async function loadCompanies() {
    try { setCompanies((await listCompanies({ active: true, limit: 100 })).data); }
    catch (cause) { setError(userFacingError(cause, language)); }
  }
  async function load() {
    setLoading(true); setError('');
    try {
      const result = await listVisits({ q: search || undefined, companyId: filterCompany, status: filterStatus || undefined, date: filterDate || undefined, page, limit: 20 });
      setVisits(result.data); setTotal(result.pagination.total);
    } catch (cause) { setError(userFacingError(cause, language)); }
    finally { setLoading(false); }
  }
  const hasFilters = Boolean(search.trim() || filterCompany !== undefined || filterStatus || filterDate);
  const reset = () => { setSearch(''); setFilterCompany(undefined); setFilterStatus(''); setFilterDate(''); setPage(1); };
  const countLabel = total === 1 ? t('visits.visit') : t('visits.visits');
  const status = (value: VisitStatus) => <span className={`status-badge ${value === 'PENDING_INDUCTION' ? 'bg-amber-100 text-amber-700' : value === 'OUT' ? 'bg-gray-100 text-gray-700' : value === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{visitStatusLabel(value, language)}</span>;
  const emptyMessage = hasFilters ? t('visits.noSearchResults') : t('visits.noVisits');

  return <Layout><div className="visits-page">
    <header className="page-header-compact"><div><p className="page-eyebrow">{t('navigation.visits')}</p><h1>{t('visits.title')}</h1><p>{t('visits.description')}</p></div><button type="button" onClick={() => navigate('/visits/new')} className="primary-button">+ {t('visits.add')}</button></header>
    <div className="visits-toolbar">
      <div className="visit-filter-field visit-search-field"><label htmlFor="visits-search">{t('visits.search')}</label><input id="visits-search" type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={t('visits.searchPlaceholder')} /></div>
      <div className="visit-filter-field"><label htmlFor="visits-company">{t('visits.company')}</label><select id="visits-company" value={filterCompany ?? ''} onChange={e => { setFilterCompany(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}><option value="">{t('visits.allCompanies')}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.companyName}</option>)}</select></div>
      <div className="visit-filter-field"><label htmlFor="visits-status">{t('visits.status')}</label><select id="visits-status" value={filterStatus} onChange={e => { setFilterStatus(e.target.value as VisitStatus | ''); setPage(1); }}><option value="">{t('visits.allStatuses')}</option>{(['PENDING_INDUCTION', 'READY_FOR_CHECKIN', 'IN', 'OUT', 'CANCELLED'] as VisitStatus[]).map(value => <option key={value} value={value}>{visitStatusLabel(value, language)}</option>)}</select></div>
      <div className="visit-filter-field"><label htmlFor="visits-date">{t('visits.date')}</label><input id="visits-date" type="date" value={filterDate} onChange={e => { setFilterDate(e.target.value); setPage(1); }} /></div>
      {hasFilters && <button type="button" className="reset-filter-button" onClick={reset}>{t('visits.reset')}</button>}
    </div>
    {error ? <ErrorState message={error} onRetry={load} /> : loading ? <p className="page-loading" role="status">{t('common.loading')}</p> : <>
      <p className="result-count visits-result-count">{total} {countLabel}</p>
      {!visits.length ? <div className="visitor-empty"><EmptyState message={emptyMessage} />{hasFilters && <button type="button" className="reset-filter-button" onClick={reset}>{t('visits.reset')}</button>}</div> : <>
        <div className="visits-table-wrap"><table className="visits-table"><thead><tr><th>{t('visits.code')}</th><th>{t('visits.date')}</th><th>{t('visits.company')}</th><th>{t('visits.host')}</th><th>{t('visits.visitors')}</th><th>{t('visits.status')}</th><th>{t('visits.action')}</th></tr></thead><tbody>{visits.map(visit => <tr key={visit.Id}><td><button type="button" className="visit-code-link" onClick={() => navigate(`/visits/${visit.Id}`)}>{visit.VisitCode}</button></td><td>{formatDate(visit.VisitDate)}</td><td className="table-primary-text">{visit.CompanyName}</td><td>{visit.HostName}</td><td>{visit.VisitorCount ?? '—'} {t('visits.visitors')}</td><td>{status(visit.Status)}</td><td><button type="button" className="row-action" onClick={() => navigate(`/visits/${visit.Id}`)}>{t('visits.view')}</button></td></tr>)}</tbody></table></div>
        <div className="mobile-record-list visits-mobile-list">{visits.map(visit => <article key={visit.Id} className="mobile-record-card"><div className="mobile-record-heading"><button type="button" className="visit-code-link" onClick={() => navigate(`/visits/${visit.Id}`)}>{visit.VisitCode}</button>{status(visit.Status)}</div><dl className="mobile-record-details"><div><dt>{t('visits.date')}</dt><dd>{formatDate(visit.VisitDate)}</dd></div><div><dt>{t('visits.company')}</dt><dd>{visit.CompanyName}</dd></div><div><dt>{t('visits.host')}</dt><dd>{visit.HostName}</dd></div><div><dt>{t('visits.visitors')}</dt><dd>{visit.VisitorCount ?? '—'} {t('visits.visitors')}</dd></div></dl><button type="button" className="row-action" onClick={() => navigate(`/visits/${visit.Id}`)}>{t('visits.view')}</button></article>)}</div>
      </>}
    </>}</div></Layout>;
}
