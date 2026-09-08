import { describe, expect, it } from 'vitest';
import { translate } from './translations';

describe('operational page translations', () => {
  it('keeps visits and inside actions bilingual', () => {
    expect(translate('en', 'inside.checkoutDescription')).toBe('All visitors in this visit will be marked as checked out.');
    expect(translate('id', 'inside.checkoutDescription')).toBe('Semua pengunjung dalam kunjungan ini akan ditandai sudah keluar.');
    expect(translate('en', 'inside.activeVisits')).toBe('active visits');
    expect(translate('id', 'inside.activeVisits')).toBe('kunjungan aktif');
  });

  it('localizes safety content metadata and development helper', () => {
    expect(translate('en', 'safetyContent.visible')).toBe('Visible');
    expect(translate('id', 'safetyContent.visible')).toBe('Ditampilkan');
    expect(translate('en', 'safetyContent.sample')).toBe('Fill sample');
    expect(translate('id', 'safetyContent.sample')).toBe('Isi contoh');
  });
});
