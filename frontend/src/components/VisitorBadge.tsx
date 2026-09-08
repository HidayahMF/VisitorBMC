import { useLanguage } from '../i18n/LanguageContext';
import { type VisitDetail } from '../types/visit';
import logo from '../assets/logobmcbg1.png';

export function VisitorBadge({ visit }: { visit: VisitDetail }) {
  const { language, t } = useLanguage();
  const visitor = visit.Visitors[0];
  const date = new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(visit.VisitDate));
  return <article className="visitor-badge" aria-label={`${t('badge.type')}: ${visitor?.VisitorName || '-'}`}>
    <header className="visitor-badge-header"><div className="visitor-badge-brand"><img src={logo} alt="Braja Mukti Cakra" className="visitor-badge-logo" /></div><span className="visitor-badge-type">{t('badge.type')}</span></header>
    <div className="visitor-badge-body"><p className="visitor-badge-eyebrow">{t('badge.code')}</p><h2>{visitor?.VisitorName || '-'}</h2><p className="visitor-badge-code">{visitor?.VisitorCode || '-'}</p><p className="visitor-badge-company">{visit.Company.CompanyName}</p></div>
    <footer className="visitor-badge-footer"><div><span>{t('badge.host')}</span><strong>{visit.HostName}</strong></div><div><span>{t('badge.date')}</span><strong>{date}</strong></div><div><span>{t('badge.visitCode')}</span><strong>{visit.VisitCode}</strong></div></footer>
  </article>;
}
