import type { Overview, ReportResponse, ReportType } from './types';
import { isMock, getMockOverview, mockReportRows, mockLoginUsername, mockLoginPassword } from './mock';

const TOKEN_KEY = 'bmc.security.token';

const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://online.bmc.co.id:47213';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthed(): boolean {
  return isMock() || getToken() !== null;
}

export function securityLogout(): void {
  clearToken();
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  silent401?: boolean;
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
  const { method = 'GET', body, auth = true, silent401 = false } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    clearToken();
    if (!silent401) {
      window.location.reload();
      throw new Error('Sesi berakhir. Silakan login kembali.');
    }
    throw new Error('Username atau password salah');
  }

  if (!response.ok) {
    return parseError(response);
  }

  return (await parseBody(response)) as T;
}

export async function securityLogin(username: string, password: string): Promise<void> {
  if (isMock()) {
    if (username === mockLoginUsername() && password === mockLoginPassword()) {
      setToken('mock-token');
      return;
    }
    throw new Error('Username atau password salah');
  }
  const data = await request<{ token: string }>('/api/user/security-login', {
    method: 'POST',
    body: { username, password },
    auth: false,
  });
  setToken(data.token);
}

export async function fetchOverview(): Promise<Overview> {
  if (isMock()) return getMockOverview();
  return request<Overview>('/api/security/overview');
}

export async function returnTravel(id: number | string, nip: string): Promise<void> {
  if (isMock()) return;
  await request<undefined>('/api/travel/return', { method: 'POST', body: { id, nip } });
}

export async function fetchReport(type: ReportType, start: string, end: string): Promise<ReportResponse> {
  if (isMock()) return { rows: mockReportRows(type, start, end) };
  const query = new URLSearchParams({ type, start, end }).toString();
  return request<ReportResponse>(`/api/security/report?${query}`);
}