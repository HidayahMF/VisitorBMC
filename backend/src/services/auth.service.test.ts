import { describe, expect, it } from 'vitest';
import {
  comparePassword,
  formatBirthdateToPassword,
} from './auth.service';

describe('HRIS birthdate login', () => {
  it('menghasilkan DDMMYY berbasis UTC', () => {
    expect(formatBirthdateToPassword('2002-09-13')).toBe('130902');
    expect(formatBirthdateToPassword('1996-03-01')).toBe('010396');
  });

  it('menerima DDMMYY dan DD/MM/YY', async () => {
    expect(await comparePassword('130902', '2002-09-13')).toBe(true);
    expect(await comparePassword('13/09/02', '2002-09-13')).toBe(true);
    expect(await comparePassword('13/09/2002', '2002-09-13')).toBe(true);
  });

  it('menolak tanggal lahir yang salah', async () => {
    expect(await comparePassword('140902', '2002-09-13')).toBe(false);
    expect(await comparePassword('13/10/02', '2002-09-13')).toBe(false);
  });
});
