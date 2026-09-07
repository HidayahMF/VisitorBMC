import { Icon } from './Icon';

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

export function DevDeleteButton({ onClick, label = 'Hapus (dev)' }: DevDeleteButtonProps) {
  if (!import.meta.env.DEV) return null;

  return (
    <button
      type="button"
      className="text-xs px-3 py-1 border border-red-200 rounded text-red-600 hover:bg-red-50"
      onClick={() => void onClick()}
    >
      {label}
    </button>
  );
}
