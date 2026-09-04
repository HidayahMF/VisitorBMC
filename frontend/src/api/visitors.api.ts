import { apiClient } from './client';
import { type Visitor, type VisitorListResponse, type CreateVisitorResponse } from '../types/visitor';

function toVisitor(row: Record<string, unknown>): Visitor {
  return {
    id: row.Id as number,
    visitorCode: row.VisitorCode as string,
    visitorName: row.VisitorName as string,
    phoneNumber: row.PhoneNumber as string | null,
    isActive: Boolean(row.IsActive),
    createdAt: row.CreatedAt as string,
    updatedAt: row.UpdatedAt as string | null,
    company: {
      id: (row.CompanyId as number) ?? (row.Company as { Id: number })?.Id,
      companyName: (row.CompanyName as string) ?? (row.Company as { CompanyName: string })?.CompanyName,
    },
  };
}

export async function listVisitors(params?: {
  q?: string;
  companyId?: number;
  active?: boolean;
  page?: number;
  limit?: number;
}): Promise<VisitorListResponse> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.companyId) query.set('companyId', String(params.companyId));
  if (params?.active !== undefined) query.set('active', String(params.active));
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const result = await apiClient<{ data: Record<string, unknown>[]; pagination: VisitorListResponse['pagination'] }>(`/visitors?${query.toString()}`);
  return { data: result.data.map(toVisitor), pagination: result.pagination };
}

export async function searchVisitors(q: string): Promise<{ Id: number; VisitorCode: string; VisitorName: string; PhoneNumber: string | null }[]> {
  return apiClient(`/visitors/search?q=${encodeURIComponent(q)}`);
}

export async function getVisitor(id: number): Promise<Visitor> {
  return toVisitor(await apiClient<Record<string, unknown>>(`/visitors/${id}`));
}

export async function createVisitor(data: { visitorName: string; companyId: number; phoneNumber?: string }): Promise<CreateVisitorResponse> {
  const result = await apiClient<{ visitor: Record<string, unknown>; potentialMatches?: CreateVisitorResponse['potentialMatches'] }>('/visitors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return { visitor: toVisitor(result.visitor), potentialMatches: result.potentialMatches };
}

export async function updateVisitor(id: number, data: { visitorName?: string; companyId?: number; phoneNumber?: string }): Promise<Visitor> {
  return toVisitor(await apiClient<Record<string, unknown>>(`/visitors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }));
}

export async function updateVisitorStatus(id: number, isActive: boolean): Promise<Visitor> {
  return toVisitor(await apiClient<Record<string, unknown>>(`/visitors/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  }));
}
