import { describe, expect, it } from 'vitest';
import { visitStatusLabel } from './visit-status';

describe('visitStatusLabel', () => {
  it('uses explicit labels for the registration lifecycle', () => {
    expect(visitStatusLabel('PENDING_INDUCTION')).toBe('Pending Induction');
    expect(visitStatusLabel('READY_FOR_CHECKIN')).toBe('Ready for Check-In');
    expect(visitStatusLabel('IN')).toBe('Inside');
    expect(visitStatusLabel('OUT')).toBe('Checked Out');
  });
});
