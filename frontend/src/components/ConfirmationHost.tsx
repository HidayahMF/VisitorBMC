import { useEffect, useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
type Pending = { message: string; resolve: (value: boolean) => void; trigger: HTMLElement | null };
let confirmHandler: ((message: string, trigger: HTMLElement | null) => Promise<boolean>) | null = null;
export function confirmAction(message: string) { return confirmHandler?.(message, document.activeElement as HTMLElement | null) ?? Promise.resolve(false); }
export function ConfirmationHost() { const [pending, setPending] = useState<Pending | null>(null); useEffect(() => { confirmHandler = (message, trigger) => new Promise(resolve => setPending({ message, resolve, trigger })); return () => { confirmHandler = null; }; }, []); if (!pending) return null; const finish = (value: boolean) => { pending.resolve(value); setPending(null); window.setTimeout(() => pending.trigger?.focus(), 0); }; return <ConfirmDialog message={pending.message} onConfirm={() => finish(true)} onCancel={() => finish(false)} />; }
