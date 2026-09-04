export interface Company {
  id: number;
  companyName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CompanyListResponse {
  data: Company[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
