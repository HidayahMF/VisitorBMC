export type VisitStatus = 'PENDING_INDUCTION' | 'READY_FOR_CHECKIN' | 'IN' | 'OUT' | 'CANCELLED';

export type SafetyStatus = 'VALID' | 'REQUIRED' | 'EXPIRED';

export interface VisitVisitor {
  Id: number;
  VisitorCode: string;
  VisitorName: string;
  PhoneNumber: string | null;
  SafetyStatus: SafetyStatus;
  ValidUntil?: string;
}

export interface Visit {
  Id: number;
  VisitCode: string;
  CompanyId: number;
  CompanyName: string;
  HostName: string;
  Purpose: string;
  VisitDate: string;
  CheckInTime: string | null;
  CheckOutTime: string | null;
  Status: VisitStatus;
  CreatedBy: number;
  CheckedOutBy: number | null;
  CreatedAt: string;
  UpdatedAt: string | null;
  VisitorCount?: number;
}

export interface VisitDetail extends Omit<Visit, 'CompanyId' | 'CompanyName'> {
  Company: {
    Id: number;
    CompanyName: string;
  };
  Visitors: VisitVisitor[];
  SafetySummary: {
    totalVisitors: number;
    cleared: number;
    requiresInduction: number;
  };
}

export interface VisitListResponse {
  data: Visit[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SafetyInductionConfig {
  id: number;
  title: string;
  version: number;
  forceReinductionOnNewVersion: boolean;
}

export interface VisitorSafetyCheck {
  visitorId: number;
  visitorName: string;
  status: SafetyStatus;
  reason?: 'NEVER_COMPLETED' | 'EXPIRED' | 'NEW_VERSION_REQUIRED';
  lastCompletedAt?: string;
  validUntil?: string;
  inductionVersion?: number;
}

export interface SafetyCheckSummary {
  safetyInduction: SafetyInductionConfig | null;
  summary: {
    totalVisitors: number;
    valid: number;
    required: number;
    expired: number;
    requiresInduction: number;
  };
  visitors: VisitorSafetyCheck[];
}

export interface DuplicateCheckResult {
  strongDuplicate: boolean;
  potentialMatches: {
    Id: number;
    VisitorCode: string;
    VisitorName: string;
    CompanyName: string;
    PhoneNumber: string | null;
  }[];
}
