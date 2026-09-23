import type { Overview, ReportResponse, ReportType } from './types';
import { isMock, getMockOverview, mockReportRows } from './mock';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function parseError(response: Response): Promise<never> {
  let message = `Request gagal (${response.status})`;
  try {
    const data = await response.json();
    if (data && typeof data.error === 'string') message = data.error;
    else if (data && typeof data.message === 'string') message = data.message;
  } catch {
    // body tidak berupa JSON, pakai status text
  }
  throw new Error(message);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(path, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    window.location.reload();
    throw new Error('Sesi berakhir. Silakan login kembali.');
  }

  if (!response.ok) {
    return parseError(response);
  }

  return (await parseBody(response)) as T;
}

export async function fetchOverview(): Promise<Overview> {
  if (isMock()) return getMockOverview();
  return request<Overview>('/api/security/overview');
}

export async function returnTravel(id: number | string, nip: string, returnTime: string): Promise<void> {
  if (isMock()) return;
  await request<undefined>('/api/travel/return', { method: 'POST', body: { id, travelId: id, nip, returnTime } });
}

export async function fetchReport(type: ReportType, start: string, end: string): Promise<ReportResponse> {
  if (isMock()) return { rows: mockReportRows(type, start, end) };
  const query = new URLSearchParams({ type, start, end }).toString();
  return request<ReportResponse>(`/api/security/report?${query}`);
}
