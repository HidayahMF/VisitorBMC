import { useEffect, useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
type ConfirmOptions = { confirmLabel?: string; cancelLabel?: string };
type Pending = { message: string; resolve: (value: boolean) => void; trigger: HTMLElement | null; options?: ConfirmOptions };
let confirmHandler: ((message: string, trigger: HTMLElement | null, options?: ConfirmOptions) => Promise<boolean>) | null = null;
export function confirmAction(message: string, options?: ConfirmOptions) { return confirmHandler?.(message, document.activeElement as HTMLElement | null, options) ?? Promise.resolve(false); }
export function ConfirmationHost() { const [pending, setPending] = useState<Pending | null>(null); useEffect(() => { confirmHandler = (message, trigger, options) => new Promise(resolve => setPending({ message, resolve, trigger, options })); return () => { confirmHandler = null; }; }, []); if (!pending) return null; const finish = (value: boolean) => { pending.resolve(value); setPending(null); window.setTimeout(() => pending.trigger?.focus(), 0); }; return <ConfirmDialog message={pending.message} onConfirm={() => finish(true)} onCancel={() => finish(false)} confirmLabel={pending.options?.confirmLabel} cancelLabel={pending.options?.cancelLabel} />; }
