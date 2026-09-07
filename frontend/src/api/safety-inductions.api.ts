import { apiClient } from './client';
import { type InductionContentResponse, type InductionRecord } from '../types/induction';

export async function getActiveInductionContents(): Promise<InductionContentResponse> {
  return apiClient<InductionContentResponse>('/safety-inductions/active/contents');
}

export async function getVisitorInductionHistory(visitorId: number): Promise<InductionRecord[]> {
  return apiClient<InductionRecord[]>(`/safety-inductions/visitor/${visitorId}/history`);
}

export async function completeInduction(data: {
  visitorId: number;
  visitId: number;
  acknowledged: boolean;
}): Promise<{ recordId: number; validUntil: string }> {
  return apiClient<{ recordId: number; validUntil: string }>('/safety-inductions/complete', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
