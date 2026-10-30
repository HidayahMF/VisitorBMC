import { env } from '../config/env';

export type TravelScanEvent = 'departed' | 'returned';
export interface TravelScanResponse { success: true; event: TravelScanEvent; message: string; speech: string; }

export class TravelScanError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
  }
}

const TRAVEL_ID_RE = /^[A-Za-z0-9._-]{1,50}$/;
const QR_TOKEN_RE = /^[a-f0-9]{48}$/i;

export function isTravelScanInput(travelId: string, qrToken: string): boolean {
  return TRAVEL_ID_RE.test(travelId) && QR_TOKEN_RE.test(qrToken);
}

export async function scanTravelAtHr(travelId: string, qrToken: string): Promise<TravelScanResponse> {
  if (!env.TRAVEL_API_BASE_URL || !env.TRAVEL_API_TOKEN) throw new Error('Travel scan proxy belum dikonfigurasi.');
  const response = await fetch(`${env.TRAVEL_API_BASE_URL.replace(/\/$/, '')}/api/travel/qr/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.TRAVEL_API_TOKEN}` },
    body: JSON.stringify({ travelId, qrToken }),
  });
  const body = await response.json().catch(() => null) as { error?: string; message?: string; status?: string; event?: TravelScanEvent; speech?: string; success?: boolean } | null;
  if (!response.ok) throw new TravelScanError(body?.error || body?.message || 'Scan QR gagal.', response.status);
  if (body?.success !== true || (body.event !== 'departed' && body.event !== 'returned') || typeof body.message !== 'string' || typeof body.speech !== 'string') throw new Error('Respons scan QR tidak valid.');
  return body as TravelScanResponse;
}
