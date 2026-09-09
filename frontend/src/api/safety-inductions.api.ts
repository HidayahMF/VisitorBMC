import { apiClient } from './client';
import { type InductionContent, type InductionContentResponse, type InductionRecord } from '../types/induction';

export async function getActiveInductionContents(): Promise<InductionContentResponse> {
  return apiClient<InductionContentResponse>('/safety-inductions/active/contents');
}

export interface InductionWorkflow { visitId: number; visitCode: string; status: string; visitors: Array<{ visitorId: number; visitorName: string; safetyStatus: 'VALID' | 'REQUIRED' | 'EXPIRED'; needsInduction: boolean }>; requiredCount: number; completedCount: number; remainingCount: number; nextVisitorId: number | null; }
export async function issueInductionToken(visitId: number): Promise<{ token: string; expiresAt: string }> { return apiClient(`/safety-inductions/access/${visitId}`, { method: 'POST' }); }
export async function getInductionWorkflow(token: string): Promise<InductionWorkflow> { return apiClient<InductionWorkflow>(`/safety-inductions/token/${encodeURIComponent(token)}/workflow`); }

export async function registerPublicVisit(data: {
  companyName: string;
  hostName: string;
  purpose: string;
  visitors: Array<{ name: string; phoneNumber?: string }>;
}): Promise<{ visitId: number; visitCode: string; token: string; expiresAt: string; visitors: Array<{ id: number; name: string }> }> {
  return apiClient('/safety-inductions/public/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getVisitorInductionHistory(visitorId: number): Promise<InductionRecord[]> {
  return apiClient<InductionRecord[]>(`/safety-inductions/visitor/${visitorId}/history`);
}
export async function getInductionConfig() { return apiClient<Array<{ Id:number; Title:string; Version:number; ValidMonths:number; IsActive:boolean; ForceReinductionOnNewVersion:boolean }>>('/safety-inductions/manage/config'); }
export async function updateInductionConfig(data: { validMonths:number; forceReinductionOnNewVersion:boolean }) { return apiClient('/safety-inductions/manage/config', { method:'PATCH', body:JSON.stringify(data) }); }

export async function listManagedInductionContents(): Promise<InductionContent[]> {
  return apiClient<InductionContent[]>('/safety-inductions/manage/contents');
}

export async function uploadInductionContent(data: {
  file: File;
  title: string;
  description: string;
}): Promise<InductionContent> {
  const form = new FormData();
  form.append('file', data.file);
  form.append('title', data.title);
  form.append('description', data.description);
  return apiClient<InductionContent>('/safety-inductions/manage/contents', {
    method: 'POST',
    body: form,
  });
}

export async function updateInductionContentStatus(id: number, isActive: boolean): Promise<void> {
  await apiClient<void>(`/safety-inductions/manage/contents/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export async function deleteInductionContent(id: number): Promise<void> {
  await apiClient<void>(`/safety-inductions/manage/contents/${id}`, { method: 'DELETE' });
}

export async function completeInduction(data: {
  token: string;
  visitorId: number;
  acknowledged: boolean;
}): Promise<{ recordId: number; completedAt: string; acknowledgedAt: string; validUntil: string; workflow?: InductionWorkflow }> {
  return apiClient<{ recordId: number; completedAt: string; acknowledgedAt: string; validUntil: string }>('/safety-inductions/complete', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function completeGroupInduction(data: {
  token: string;
  visitorIds: number[];
  acknowledged: boolean;
}): Promise<{ workflow: InductionWorkflow }> {
  return apiClient('/safety-inductions/complete-group', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
