import { apiClient } from './client';
export interface AuditLog { Id: number; UserId: number | null; UserName: string | null; Action: string; EntityType: string; EntityId: number | null; Details: string | null; IpAddress: string | null; CreatedAt: string; }
export interface AuditResponse { data: AuditLog[]; pagination: { page: number; limit: number; total: number; totalPages: number }; }
export async function listAuditLogs(params: { action?: string; from?: string; to?: string; q?: string; page?: number } = {}) { const query = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value) query.set(key, String(value)); }); return apiClient<AuditResponse>(`/audit-logs?${query}`); }
