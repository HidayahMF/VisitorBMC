import { describe, expect, it } from 'vitest';
import { visitStatusLabel } from './visit-status';

describe('visitStatusLabel', () => {
  it('uses explicit labels for the registration lifecycle', () => {
    expect(visitStatusLabel('PENDING_INDUCTION')).toBe('Perlu Induksi');
    expect(visitStatusLabel('READY_FOR_CHECKIN')).toBe('Siap Masuk');
    expect(visitStatusLabel('IN')).toBe('Di Dalam');
    expect(visitStatusLabel('OUT')).toBe('Sudah Keluar');
    expect(visitStatusLabel('IN', 'en')).toBe('Currently Inside');
  });
});
