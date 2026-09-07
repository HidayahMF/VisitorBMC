export interface InductionContent {
  Id: number;
  SafetyInductionId: number;
  ContentType: 'VIDEO' | 'IMAGE' | 'PDF';
  ContentUrl: string;
  Title: string | null;
  Description: string | null;
  SortOrder: number;
  IsRequired: boolean;
  IsActive: boolean;
  CreatedAt: string;
}

export interface InductionConfig {
  id: number;
  title: string;
  version: number;
  validMonths: number;
}

export interface InductionContentResponse {
  induction: InductionConfig;
  contents: InductionContent[];
}

export interface InductionRecord {
  Id: number;
  VisitorId: number;
  VisitId: number | null;
  SafetyInductionId: number;
  InductionVersion: number;
  CompletedAt: string;
  ValidUntil: string;
  Acknowledged: boolean;
  AcknowledgedAt: string | null;
  CreatedBy: number | null;
  CreatedAt: string;
}
