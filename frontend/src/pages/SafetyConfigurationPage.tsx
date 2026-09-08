import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { getInductionConfig, updateInductionConfig } from '../api/safety-inductions.api';
import { ErrorState } from '../components/AsyncState';
import { useLanguage } from '../i18n/LanguageContext';

export function SafetyConfigurationPage() {
  const { t } = useLanguage();
  const [months, setMonths] = useState(6); const [force, setForce] = useState(false); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  async function load() { try { const rows = await getInductionConfig(); const row = rows[0]; if (row) { setMonths(row.ValidMonths); setForce(row.ForceReinductionOnNewVersion); } } catch { setError(t('safetyConfiguration.loadError')); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  async function save(event: React.FormEvent) { event.preventDefault(); setSaving(true); setError(''); setMessage(''); try { await updateInductionConfig({ validMonths: months, forceReinductionOnNewVersion: force }); setMessage(t('safetyConfiguration.saved')); } catch (cause) { setError(cause instanceof Error ? cause.message : t('safetyConfiguration.saveError')); } finally { setSaving(false); } }
  return <Layout><div className="admin-page safety-configuration-page"><header className="page-header-compact"><div><p className="page-eyebrow">{t('safetyConfiguration.eyebrow')}</p><h1>{t('safetyConfiguration.title')}</h1><p>{t('safetyConfiguration.description')}</p></div></header>{error && <ErrorState message={error} onRetry={load} />}{loading ? <p className="page-loading" role="status">{t('common.loading')}</p> : <form onSubmit={save} className="configuration-panel"><div className="form-field"><label htmlFor="valid-months">{t('safetyConfiguration.validity')}</label><div className="number-with-unit"><input id="valid-months" type="number" min="1" max="120" value={months} onChange={event => setMonths(Number(event.target.value))} disabled={saving} aria-describedby="validity-help" required /><span>{t('safetyConfiguration.months')}</span></div><p id="validity-help" className="form-helper">{t('safetyConfiguration.validityHelp')}</p></div><label className="checkbox-field"><input type="checkbox" checked={force} onChange={event => setForce(event.target.checked)} disabled={saving} /> <span>{t('safetyConfiguration.forceReinduction')}</span></label>{message && <p className="form-success" role="status">{message}</p>}<button type="submit" className="primary-button" disabled={saving}>{saving ? t('safetyConfiguration.saving') : t('common.save')}</button></form>}</div></Layout>;
}
