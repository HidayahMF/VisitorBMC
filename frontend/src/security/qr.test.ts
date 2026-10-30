import { describe, expect, it } from 'vitest';
import { parseTravelQr, scanSuccessCopy } from './qr';

describe('parseTravelQr', () => {
  it('menerima ID string atau number dari QR', () => {
    expect(parseTravelQr('{"id":"201"}')).toEqual({ id: '201' });
    expect(parseTravelQr('{"travelId":201}')).toEqual({ id: '201' });
  });

  it('menolak payload tidak lengkap atau tidak aman', () => {
    expect(parseTravelQr('{}')).toBeNull();
    expect(parseTravelQr('201')).toEqual({ id: '201' });
    expect(parseTravelQr('{"id":"T/0377"}')).toBeNull();
  });

  it('menerima URL QR dari WhatsApp', () => {
    expect(parseTravelQr('https://employee-portal.bmc.co.id/travel/qr/T.0377.179333039161/anything')).toEqual({ id: 'T.0377.179333039161' });
  });
});

describe('scanSuccessCopy', () => {
  it('menghasilkan pesan keberangkatan dan kepulangan', () => {
    expect(scanSuccessCopy('DEPARTED')).toEqual(['Berhasil dicatat berangkat.', 'Selamat melakukan perjalanan, hati-hati di jalan.']);
    expect(scanSuccessCopy('RETURNED')).toEqual(['Berhasil dicatat kembali.', 'Terima kasih, perjalanan Anda selesai.']);
  });
});
