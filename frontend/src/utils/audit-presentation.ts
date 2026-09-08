import type { Language } from '../i18n/translations';
import type { AuditLog } from '../api/audit.api';

const actions: Record<string, { en: string; id: string }> = {
  LOGIN_SUCCESS: { en: 'Login successful', id: 'Login berhasil' },
  LOGIN_FAILED: { en: 'Login failed', id: 'Login gagal' },
  VISIT_CREATED: { en: 'Visit created', id: 'Kunjungan dibuat' },
  VISIT_CHECKED_IN: { en: 'Visit checked in', id: 'Kunjungan masuk' },
  VISIT_CHECKED_OUT: { en: 'Visit checked out', id: 'Kunjungan keluar' },
  SAFETY_INDUCTION_COMPLETED: { en: 'Safety induction completed', id: 'Safety induction selesai' },
  SAFETY_CONFIG_UPDATED: { en: 'Safety configuration updated', id: 'Konfigurasi safety diperbarui' },
  USER_ACCESS_GRANTED: { en: 'User access granted', id: 'Akses pengguna diberikan' },
  USER_ROLE_UPDATED: { en: 'User role updated', id: 'Role pengguna diperbarui' },
  USER_ACCESS_UPDATED: { en: 'User access updated', id: 'Akses pengguna diperbarui' },
};

const entities: Record<string, { en: string; id: string }> = {
  User: { en: 'User', id: 'Pengguna' },
  Visit: { en: 'Visit', id: 'Kunjungan' },
  Visitor: { en: 'Visitor', id: 'Pengunjung' },
  Company: { en: 'Company', id: 'Perusahaan' },
  VisitorInductionRecord: { en: 'Safety Induction', id: 'Safety Induction' },
  SafetyInduction: { en: 'Safety Configuration', id: 'Konfigurasi Safety' },
  SafetyConfiguration: { en: 'Safety Configuration', id: 'Konfigurasi Safety' },
};

function humanize(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase().replace(/^./, char => char.toUpperCase());
}

export function actionLabel(action: string, language: Language): string { return actions[action]?.[language] ?? humanize(action); }
export function entityLabel(entity: string, language: Language): string { return entities[entity]?.[language] ?? humanize(entity); }
export function parseAuditDetails(details: string | null): Record<string, unknown> | null {
  if (!details) return null;
  try { const parsed: unknown = JSON.parse(details); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null; }
  catch { return null; }
}
export function prettyDetails(details: string | null): string { const parsed = parseAuditDetails(details); return parsed ? JSON.stringify(parsed, null, 2) : details || '-'; }
export function detailSummary(log: AuditLog, language: Language): string {
  const data = parseAuditDetails(log.Details);
  if (log.Action === 'LOGIN_SUCCESS') return language === 'id' ? 'Pengguna berhasil masuk ke sistem.' : 'User successfully signed in.';
  if (log.Action === 'LOGIN_FAILED') return language === 'id' ? 'Upaya masuk pengguna gagal.' : 'User sign-in attempt failed.';
  if (log.Action === 'VISIT_CREATED' && typeof data?.visitCode === 'string') return language === 'id' ? `Kunjungan ${data.visitCode} dibuat.` : `Visit ${data.visitCode} was created.`;
  if (log.Action === 'SAFETY_INDUCTION_COMPLETED') return language === 'id' ? 'Safety induction pengunjung telah diselesaikan.' : 'Visitor safety induction was completed.';
  if (log.Action === 'USER_ACCESS_GRANTED') return language === 'id' ? 'Akses pengguna baru diberikan.' : 'New user access was granted.';
  if (log.Action === 'SAFETY_CONFIG_UPDATED') return language === 'id' ? 'Aturan konfigurasi safety diperbarui.' : 'Safety configuration rules were updated.';
  return language === 'id' ? 'Aktivitas tercatat dalam sistem.' : 'Activity recorded in the system.';
}
export function formatAuditDate(value: string, language: Language): { date: string; time: string } {
  const date = new Date(value); const locale = language === 'id' ? 'id-ID' : 'en-GB';
  return { date: new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(date), time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date) };
}
export function auditActionValues(): string[] { return Object.keys(actions); }
