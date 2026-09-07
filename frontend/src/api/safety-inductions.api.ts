import { apiClient } from './client';
import { type InductionContent, type InductionContentResponse, type InductionRecord } from '../types/induction';

export async function getActiveInductionContents(): Promise<InductionContentResponse> {
  return apiClient<InductionContentResponse>('/safety-inductions/active/contents');
}

export async function getVisitorInductionHistory(visitorId: number): Promise<InductionRecord[]> {
  return apiClient<InductionRecord[]>(`/safety-inductions/visitor/${visitorId}/history`);
}

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
  visitorId: number;
  visitId: number;
  acknowledged: boolean;
}): Promise<{ recordId: number; completedAt: string; acknowledgedAt: string; validUntil: string }> {
  return apiClient<{ recordId: number; completedAt: string; acknowledgedAt: string; validUntil: string }>('/safety-inductions/complete', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
