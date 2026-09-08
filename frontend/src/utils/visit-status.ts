import { type VisitStatus } from '../types/visit';
import { translations, type Language } from '../i18n/translations';

export function visitStatusLabel(status: VisitStatus, language: Language = 'id'): string {
  const labels: Record<VisitStatus, keyof typeof translations.id.status> = { PENDING_INDUCTION: 'required', READY_FOR_CHECKIN: 'ready', IN: 'inside', OUT: 'out', CANCELLED: 'cancelled' };
  return translations[language].status[labels[status]] || status;
}
