export interface Visitor {
  id: number;
  visitorCode: string;
  visitorName: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  company: { id: number; companyName: string };
}

export interface VisitorListResponse {
  data: Visitor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PotentialMatch {
  Id: number;
  VisitorCode: string;
  VisitorName: string;
  PhoneNumber: string | null;
}

export interface CreateVisitorResponse {
  visitor: Visitor;
  potentialMatches?: PotentialMatch[];
}

export interface VisitorVisitHistoryEntry {
  VisitId: number;
  VisitCode: string;
  CompanyName: string;
  HostName: string;
  Purpose: string;
  VisitDate: string;
  CheckInTime: string | null;
  CheckOutTime: string | null;
  Status: string;
}
