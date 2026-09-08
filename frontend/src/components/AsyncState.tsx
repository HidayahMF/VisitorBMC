import { useLanguage } from '../i18n/LanguageContext';

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700" role="alert">
      <p>{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="mt-3 px-3 py-1.5 border border-red-300 rounded hover:bg-red-100">{t('common.retry')}</button>}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="bg-white border rounded p-6 text-center text-sm text-gray-500">{message}</div>;
}
