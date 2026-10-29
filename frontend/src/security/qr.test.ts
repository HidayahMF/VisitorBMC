import { describe, expect, it } from 'vitest';
import { findTravelByQr } from './qr';

const travels = [{ id: 201, nip: '1021', nama: 'Andi', tujuan: 'Gudang', keperluan: 'Ambil barang', jamKeluar: null }] as const;

describe('findTravelByQr', () => {
  it('mencocokkan ID dari URL atau JSON QR', () => {
    expect(findTravelByQr('https://security.example/travel/201', [...travels])?.id).toBe(201);
    expect(findTravelByQr('{"travelId":201}', [...travels])?.id).toBe(201);
  });
});
