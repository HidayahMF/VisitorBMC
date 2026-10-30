import { describe, expect, it } from 'vitest';
import { scanAction } from './security.service';

describe('scanAction', () => {
  it('switches departure and return based on active checkpoint', () => {
    expect(scanAction(false)).toBe('DEPARTED');
    expect(scanAction(true)).toBe('RETURNED');
  });
});
