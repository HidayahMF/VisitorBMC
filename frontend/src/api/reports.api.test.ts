import { describe, expect, it } from 'vitest';
import { toCsv } from './reports.api';

describe('toCsv', () => {
  it('quotes commas, quotes, and newlines safely', () => {
    expect(toCsv([{ Name: 'PT A, "B"\nCabang' }])).toBe('Name\n"PT A, ""B""\nCabang"');
  });
});
