import { Icon } from './Icon';
import { useLanguage } from '../i18n/LanguageContext';

interface DevFillButtonProps {
  onClick: () => void | Promise<void>;
  label?: string;
}

interface DevDeleteButtonProps {
  onClick: () => void | Promise<void>;
  label?: string;
}

/** Development-only helper. It is removed from production builds by Vite. */
export function DevFillButton({ onClick, label = 'Isi data contoh' }: DevFillButtonProps) {
  if (!import.meta.env.DEV) return null;

  return (
    <button type="button" className="dev-fill-button" onClick={() => void onClick()}>
      <Icon name="plus" size={14} />
      {label}
    </button>
  );
}

export function DevDeleteButton({ onClick, label = 'Delete' }: DevDeleteButtonProps) {
  const { t } = useLanguage();
  if (!import.meta.env.DEV) return null;

  return (
    <button
      type="button"
      className="danger-button"
      onClick={() => void onClick()}
    >
      {label === 'Delete' ? t('common.delete') : label}
    </button>
  );
}
