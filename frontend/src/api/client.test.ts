import { describe, expect, it } from 'vitest';
import { ApiError, userFacingError } from './client';

describe('userFacingError', () => {
  it.each([[401, 'Sesi Anda telah berakhir.'], [403, 'Anda tidak memiliki akses.'], [404, 'Data tidak ditemukan.'], [500, 'Terjadi kesalahan pada server.']])('maps HTTP %s', (status, expected) => { expect(userFacingError(new ApiError('raw', status))).toBe(expected); });
  it('maps network errors', () => { expect(userFacingError(new Error('fetch failed'))).toBe('Tidak dapat terhubung ke server.'); });
});
