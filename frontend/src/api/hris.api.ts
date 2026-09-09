import { apiClient } from './client';

export interface Employee {
  name: string;
  username: string;
  isActive: boolean;
}

export async function searchEmployees(q: string, limit = 10): Promise<Employee[]> {
  return apiClient<Employee[]>(`/hris/employees?q=${encodeURIComponent(q)}&limit=${limit}`);
}

export async function searchPublicEmployees(q: string, limit = 10): Promise<Employee[]> {
  return apiClient<Employee[]>(`/hris/employees/public?q=${encodeURIComponent(q)}&limit=${limit}`);
}

export async function listPublicEmployees(limit = 50): Promise<Employee[]> {
  return apiClient<Employee[]>(`/hris/employees/public-list?limit=${limit}`);
}
