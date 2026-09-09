import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { ErrorState, EmptyState } from '../components/AsyncState';
import { listUsers, addUser, updateUser, type ManagedUser } from '../api/users.api';
import { searchEmployees, type Employee } from '../api/hris.api';
import { useLanguage } from '../i18n/LanguageContext';

export function UserManagementPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Employee[]>([]);
  const [role, setRole] = useState<ManagedUser['role']>('SECURITY');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try { setUsers(await listUsers()); }
    catch { setError(t('userManagement.loadError')); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (employee || query.trim().length < 2) { setResults([]); setSearching(false); return; }
    let active = true;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void searchEmployees(query).then(data => {
        if (active) setResults(data.filter(item => item.isActive));
      }).catch(() => { if (active) setResults([]); })
        .finally(() => { if (active) setSearching(false); });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, employee]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!employee) return;
    setSaving(true); setError('');
    try { await addUser(employee.username, role); setEmployee(null); setQuery(''); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t('userManagement.addError')); }
    finally { setSaving(false); }
  }

  async function change(user: ManagedUser, data: Partial<Pick<ManagedUser, 'role' | 'isActive'>>) {
    setSaving(true); setError('');
    try { await updateUser(user.id, data); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t('userManagement.updateError')); }
    finally { setSaving(false); }
  }

  return <Layout>
    <div className="admin-page user-management-page">
      <header className="page-header-compact">
        <div><p className="page-eyebrow">{t('userManagement.eyebrow')}</p><h1>{t('userManagement.title')}</h1><p>{t('userManagement.description')}</p></div>
      </header>
      {error && <ErrorState message={error} onRetry={load} />}
      <form onSubmit={create} className="access-form">
        <div className="section-heading"><div><h2>{t('userManagement.addTitle')}</h2><p>{t('userManagement.addDescription')}</p></div></div>
        <div className="access-form-grid">
          <div className="form-field employee-search-field">
            <label htmlFor="user-employee">{t('userManagement.employee')}</label>
            <input id="user-employee" value={employee ? `${employee.name} (${employee.username})` : query} placeholder={t('userManagement.searchPlaceholder')} onChange={event => { setEmployee(null); setQuery(event.target.value); }} autoComplete="off" role="combobox" aria-expanded={results.length > 0} aria-controls="employee-results" aria-autocomplete="list" disabled={saving} />
            {searching && <span className="field-status" role="status">{t('common.loading')}</span>}
            {results.length > 0 && <ul id="employee-results" className="employee-results" role="listbox">{results.map(item => <li key={item.username}><button type="button" role="option" onClick={() => { setEmployee(item); setQuery(item.name); setResults([]); }}>{item.name}<span>{item.username}</span></button></li>)}</ul>}
          </div>
          <div className="form-field role-field"><label htmlFor="user-role">{t('userManagement.role')}</label><select id="user-role" value={role} onChange={event => setRole(event.target.value as ManagedUser['role'])} disabled={saving}><option value="SECURITY">{t('userManagement.security')}</option><option value="MONITORING">{t('userManagement.monitoring')}</option><option value="ADMIN">{t('userManagement.admin')}</option></select></div>
          <button type="submit" className="primary-button access-submit" disabled={!employee || saving}>{saving ? t('userManagement.adding') : t('userManagement.add')}</button>
        </div>
      </form>
      <section className="user-list-section" aria-labelledby="user-list-title">
        <div className="section-heading"><div><h2 id="user-list-title">{t('userManagement.listTitle')}</h2><p>{t('userManagement.listDescription')}</p></div></div>
         {loading ? <p className="page-loading" role="status">{t('common.loading')}</p> : users.length === 0 ? <EmptyState message={t('userManagement.empty')} /> : <div className="user-list">{users.map(user => <article className="user-row" key={user.id}><div className="user-identity"><strong>{user.name || user.username}</strong><span>{t('userManagement.nip')}: {user.username}</span></div><div className="user-current-role"><span className="role-badge">{user.role === 'ADMIN' ? t('userManagement.admin') : user.role === 'MONITORING' ? t('userManagement.monitoring') : t('userManagement.security')}</span></div><div><span className={`status-badge ${user.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>{user.isActive ? t('common.active') : t('common.inactive')}</span></div><div className="user-role-control"><label className="sr-only" htmlFor={`role-${user.id}`}>{t('userManagement.changeRole')} {user.name}</label><select id={`role-${user.id}`} value={user.role} disabled={saving} onChange={event => void change(user, { role: event.target.value as ManagedUser['role'] })}><option value="SECURITY">{t('userManagement.security')}</option><option value="MONITORING">{t('userManagement.monitoring')}</option><option value="ADMIN">{t('userManagement.admin')}</option></select></div><button type="button" className={user.isActive ? 'warning-button' : 'secondary-button'} disabled={saving} onClick={() => void change(user, { isActive: !user.isActive })}>{user.isActive ? t('common.deactivate') : t('common.activate')}</button></article>)}</div>}
      </section>
    </div>
  </Layout>;
}
