import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('enters the dialog, traps Tab in both directions, and closes on Escape', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog message="Hapus data?" onConfirm={vi.fn()} onCancel={onCancel} />);
    const cancel = screen.getByText('Batal');
    const confirm = screen.getByText('Lanjutkan');
    expect(document.activeElement).toBe(cancel);
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(confirm);
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(cancel);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirm);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('returns focus to the trigger when the host closes it', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const { unmount } = render(<ConfirmDialog message="Hapus data?" onConfirm={vi.fn()} onCancel={() => { unmount(); setTimeout(() => trigger.focus(), 0); }} />);
    fireEvent.click(screen.getByText('Batal'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('keeps focus inside the dialog when focus is outside', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog message="Hapus data?" onConfirm={vi.fn()} onCancel={onCancel} />);
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByText('Batal'));
    outside.remove();
  });
});
