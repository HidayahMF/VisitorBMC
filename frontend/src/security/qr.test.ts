import { describe, expect, it } from 'vitest';
import { parseTravelQr, scanSuccessCopy } from './qr';

describe('parseTravelQr', () => {
  it('menerima payload id dan token', () => {
    const token = 'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef';
    expect(parseTravelQr(`{"id":"201","token":"${token}"}`)).toEqual({ id: '201', token });
    expect(parseTravelQr(`{"id":201,"token":"${token}"}`)).toBeNull();
  });

  it('menolak payload tidak lengkap atau bukan JSON', () => {
    expect(parseTravelQr('{"id":"201"}')).toBeNull();
    expect(parseTravelQr('201')).toBeNull();
    expect(parseTravelQr('{"id":"201","token":"qr-secret"}')).toBeNull();
  });

  it('menerima URL QR dari WhatsApp', () => {
    expect(parseTravelQr('https://employee-portal.bmc.co.id/travel/qr/T.0377.179333039161/e9464809952ecbe34967d80da5381049280e640a7a2a9665')).toEqual({ id: 'T.0377.179333039161', token: 'e9464809952ecbe34967d80da5381049280e640a7a2a9665' });
  });
});

describe('scanSuccessCopy', () => {
  it('menghasilkan pesan keberangkatan dan kepulangan', () => {
    expect(scanSuccessCopy('DEPARTED')).toEqual(['Berhasil dicatat berangkat.', 'Selamat melakukan perjalanan, hati-hati di jalan.']);
    expect(scanSuccessCopy('RETURNED')).toEqual(['Berhasil dicatat kembali.', 'Terima kasih, perjalanan Anda selesai.']);
  });
});
