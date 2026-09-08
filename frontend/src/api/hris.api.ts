import { apiClient } from './client';

export interface Employee {
  name: string;
  username: string;
  isActive: boolean;
}

export async function searchEmployees(q: string, limit = 10): Promise<Employee[]> {
  return apiClient<Employee[]>(`/hris/employees?q=${encodeURIComponent(q)}&limit=${limit}`);
}
