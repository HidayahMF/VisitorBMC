export interface TravelQrPayload {
  id: string;
  token: string;
}

export function parseTravelQr(value: string): TravelQrPayload | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const data: unknown = JSON.parse(value);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const payload = data as Record<string, unknown>;
    const id = typeof payload.id === 'string' ? payload.id.trim() : '';
    const token = typeof payload.token === 'string' ? payload.token.trim() : '';
    return /^[A-Fa-f0-9]{48}$/.test(token) && /^[A-Za-z0-9._-]{1,50}$/.test(id) ? { id, token } : null;
  } catch {
    try {
      const url = new URL(value.trim());
      const match = url.pathname.match(/^\/travel\/qr\/([^/]+)\/([a-f0-9]{48})$/i);
      if (!match) return null;
      const id = decodeURIComponent(match[1]);
      const token = match[2];
      return /^[A-Za-z0-9._-]{1,50}$/.test(id) ? { id, token } : null;
    } catch {
      return null;
    }
  }
}

export type ScanAction = 'DEPARTED' | 'RETURNED';

export interface ScanResult {
  action: ScanAction;
}

export function scanSuccessCopy(action: ScanAction): [string, string] {
  return action === 'DEPARTED'
    ? ['Berhasil dicatat berangkat.', 'Selamat melakukan perjalanan, hati-hati di jalan.']
    : ['Berhasil dicatat kembali.', 'Terima kasih, perjalanan Anda selesai.'];
}
