import { describe, expect, it } from 'vitest';
import { isTravelScanInput } from './travel-scan.service';

describe('isTravelScanInput', () => {
  it('menerima id dan token QR valid, menolak input trust boundary invalid', () => {
    expect(isTravelScanInput('T.0377.1', 'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef')).toBe(true);
    expect(isTravelScanInput('', 'bad')).toBe(false);
    expect(isTravelScanInput('T/0377', 'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef')).toBe(false);
    expect(isTravelScanInput('T.0377.1', 'bad-token')).toBe(false);
  });
});
