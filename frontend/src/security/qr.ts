import type { Travel } from './types';

function qrCandidates(value: string): string[] {
  const raw = value.trim();
  if (!raw) return [];
  const candidates = new Set([raw]);
  try {
    const url = new URL(raw);
    url.pathname.split('/').filter(Boolean).forEach((part) => candidates.add(part));
    ['id', 'travelId', 'nip'].forEach((key) => {
      const parameter = url.searchParams.get(key)?.trim();
      if (parameter) candidates.add(parameter);
    });
  } catch {
    // QR dapat berisi ID/NIP langsung, bukan URL.
  }
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    ['id', 'travelId', 'nip'].forEach((key) => {
      const value = data[key];
      if (typeof value === 'string' || typeof value === 'number') candidates.add(String(value).trim());
    });
  } catch {
    // QR bukan JSON.
  }
  return [...candidates].filter(Boolean);
}

export function findTravelByQr(value: string, travels: Travel[]): Travel | null {
  const candidates = new Set(qrCandidates(value));
  return travels.find((travel) => candidates.has(String(travel.id).trim()) || candidates.has(String(travel.nip).trim())) ?? null;
}
