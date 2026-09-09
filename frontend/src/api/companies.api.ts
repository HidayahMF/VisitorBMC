import { apiClient } from './client';
import { type Company, type CompanyListResponse } from '../types/company';

function toCompany(row: Record<string, unknown>): Company {
  return {
    id: row.Id as number,
    companyName: row.CompanyName as string,
    isActive: Boolean(row.IsActive),
    createdAt: row.CreatedAt as string,
    updatedAt: row.UpdatedAt as string | null,
  };
}

export async function listCompanies(params?: {
  q?: string;
  active?: boolean;
  page?: number;
  limit?: number;
}): Promise<CompanyListResponse> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.active !== undefined) query.set('active', String(params.active));
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const result = await apiClient<{ data: Record<string, unknown>[]; pagination: CompanyListResponse['pagination'] }>(`/companies?${query.toString()}`);
  return { data: result.data.map(toCompany), pagination: result.pagination };
}

export async function searchCompanies(q: string): Promise<Company[]> {
  const result = await apiClient<Record<string, unknown>[]>(`/companies/search?q=${encodeURIComponent(q)}`);
  return result.map(toCompany);
}

export async function listPublicCompanies(limit = 100): Promise<Company[]> {
  const result = await apiClient<{ data: Record<string, unknown>[] }>('/companies/public?active=true&limit=' + limit);
  return result.data.map(toCompany);
}

export async function createPublicCompany(data: { companyName: string }): Promise<Company> {
  const result = await apiClient<Record<string, unknown>>('/companies/public', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return toCompany(result);
}

export async function getCompany(id: number): Promise<Company> {
  return toCompany(await apiClient<Record<string, unknown>>(`/companies/${id}`));
}

export async function createCompany(data: { companyName: string }): Promise<Company> {
  const result = await apiClient<Record<string, unknown>>('/companies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return toCompany(result);
}

export async function updateCompany(id: number, data: { companyName: string }): Promise<Company> {
  const result = await apiClient<Record<string, unknown>>(`/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return toCompany(result);
}

export async function updateCompanyStatus(id: number, isActive: boolean): Promise<Company> {
  const result = await apiClient<Record<string, unknown>>(`/companies/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  return toCompany(result);
}

export async function deleteCompany(id: number): Promise<void> {
  await apiClient<void>(`/companies/${id}`, { method: 'DELETE' });
}
