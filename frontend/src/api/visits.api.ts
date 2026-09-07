import { apiClient } from './client';
import { type VisitDetail, type VisitListResponse, type SafetyCheckSummary, type DuplicateCheckResult } from '../types/visit';
import { type DashboardStats } from '../types/dashboard';

export async function listVisits(params?: {
  q?: string;
  status?: string;
  companyId?: number;
  date?: string;
  page?: number;
  limit?: number;
}): Promise<VisitListResponse> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.status) query.set('status', params.status);
  if (params?.companyId) query.set('companyId', String(params.companyId));
  if (params?.date) query.set('date', params.date);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  return apiClient<VisitListResponse>(`/visits?${query.toString()}`);
}

export async function getVisit(id: number): Promise<VisitDetail> {
  return apiClient<VisitDetail>(`/visits/${id}`);
}

export async function createVisit(data: {
  companyId: number;
  hostName: string;
  purpose: string;
  visitDate: string;
  visitorIds: number[];
}): Promise<VisitDetail> {
  return apiClient<VisitDetail>('/visits', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function safetyCheck(data: {
  companyId: number;
  visitorIds: number[];
}): Promise<SafetyCheckSummary> {
  return apiClient<SafetyCheckSummary>('/visits/safety-check', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function checkDuplicate(data: {
  visitorName: string;
  companyId: number;
  phoneNumber?: string;
}): Promise<DuplicateCheckResult> {
  return apiClient<DuplicateCheckResult>('/visits/check-duplicate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function checkInVisit(id: number): Promise<VisitDetail> {
  return apiClient<VisitDetail>(`/visits/${id}/checkin`, {
    method: 'PUT',
  });
}

export async function checkOutVisit(id: number): Promise<VisitDetail> {
  return apiClient<VisitDetail>(`/visits/${id}/checkout`, {
    method: 'PUT',
  });
}

export async function deleteVisit(id: number): Promise<void> {
  await apiClient<void>(`/visits/${id}`, { method: 'DELETE' });
}

export async function getActiveVisits(params?: {
  q?: string;
  companyId?: number;
  date?: string;
  page?: number;
  limit?: number;
}): Promise<VisitListResponse> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.companyId) query.set('companyId', String(params.companyId));
  if (params?.date) query.set('date', params.date);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  return apiClient<VisitListResponse>(`/visits/active?${query.toString()}`);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiClient<DashboardStats>('/visits/dashboard');
}
