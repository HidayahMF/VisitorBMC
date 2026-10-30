export interface TravelQrPayload {
  id: string;
}

const TRAVEL_ID_RE = /^[A-Za-z0-9._-]{1,50}$/;

function validTravelId(value: unknown): string | null {
  const id = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  return TRAVEL_ID_RE.test(id) ? id : null;
}

export function parseTravelQr(value: string): TravelQrPayload | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const raw = value.trim();
  try {
    const data: unknown = JSON.parse(raw);
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const payload = data as Record<string, unknown>;
      const id = validTravelId(payload.id ?? payload.travelId);
      return id ? { id } : null;
    }
  } catch {
    // Bukan JSON; coba URL atau ID mentah.
  }
  try {
    const url = new URL(raw);
    const match = url.pathname.match(/^\/travel\/qr\/([^/]+)/i);
    const id = validTravelId(match ? decodeURIComponent(match[1]) : url.searchParams.get('travelId'));
    return id ? { id } : null;
  } catch {
    const id = validTravelId(raw);
    return id ? { id } : null;
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
