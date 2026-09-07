import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { VisitorDetailPage } from './VisitorDetailPage';
import { AuthProvider } from '../context/AuthContext';

const { mockGetVisitor, mockGetHistory, mockGetInductionHistory } = vi.hoisted(() => ({
  mockGetVisitor: vi.fn(),
  mockGetHistory: vi.fn(),
  mockGetInductionHistory: vi.fn(),
}));

vi.mock('../api/visitors.api', () => ({
  getVisitor: (id: number) => mockGetVisitor(id),
  updateVisitorStatus: vi.fn(),
  getVisitorVisitHistory: (id: number) => mockGetHistory(id),
}));

vi.mock('../api/safety-inductions.api', () => ({
  getVisitorInductionHistory: (id: number) => mockGetInductionHistory(id),
}));

vi.mock('../api/client', () => ({
  apiClient: vi.fn(() => Promise.resolve({ id: 1, name: 'Admin', username: 'admin', role: 'ADMIN' })),
}));

const visitor = {
  id: 1,
  visitorCode: 'VST-000001',
  visitorName: 'Andi Saputra',
  phoneNumber: '08123456789',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
  company: { id: 1, companyName: 'PT ABC' },
};

const visitHistory = [
  {
    VisitId: 2,
    VisitCode: 'VIS-20260907-002',
    CompanyName: 'PT ABC',
    HostName: 'Budi',
    Purpose: 'Meeting',
    VisitDate: '2026-09-07',
    CheckInTime: '2026-09-07T02:00:00Z',
    CheckOutTime: '2026-09-07T04:00:00Z',
    Status: 'OUT',
  },
];

const inductionHistory = [
  {
    Id: 5,
    VisitorId: 1,
    VisitId: 1,
    SafetyInductionId: 1,
    InductionVersion: 1,
    CompletedAt: '2026-09-07T02:00:00Z',
    ValidUntil: '2027-03-07T02:00:00Z',
    Acknowledged: true,
    AcknowledgedAt: '2026-09-07T02:00:00Z',
    CreatedBy: 1,
    CreatedAt: '2026-09-07T02:00:00Z',
  },
];

function renderPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/visitors/1']}>
        <Routes>
          <Route path="/visitors/:id" element={<VisitorDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('VisitorDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetVisitor.mockResolvedValue(visitor);
    mockGetHistory.mockResolvedValue(visitHistory);
    mockGetInductionHistory.mockResolvedValue(inductionHistory);
  });

  it('shows visitor profile', async () => {
    renderPage();
    expect(await screen.findByText('Andi Saputra')).toBeInTheDocument();
    expect(screen.getByText('VST-000001')).toBeInTheDocument();
    expect(screen.getByText('PT ABC')).toBeInTheDocument();
  });

  it('shows visit history entries', async () => {
    renderPage();
    expect(await screen.findByText('VIS-20260907-002')).toBeInTheDocument();
    expect(screen.getByText('OUT')).toBeInTheDocument();
  });

  it('shows induction history with validity', async () => {
    renderPage();
    expect(await screen.findByText('Safety Induction V1')).toBeInTheDocument();
    expect(screen.getByText('Acknowledged')).toBeInTheDocument();
    expect(mockGetInductionHistory).toHaveBeenCalledWith(1);
  });

  it('shows empty states when no history', async () => {
    mockGetHistory.mockResolvedValue([]);
    mockGetInductionHistory.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No visits recorded.')).toBeInTheDocument();
    expect(screen.getByText('No safety induction completed.')).toBeInTheDocument();
  });
});