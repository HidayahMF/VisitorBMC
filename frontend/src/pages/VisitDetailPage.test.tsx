import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { VisitDetailPage } from './VisitDetailPage';
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../i18n/LanguageContext';

const { mockGetVisit, mockCheckIn, mockCheckOut, mockDeleteVisit, mockConfirmAction } = vi.hoisted(() => ({
  mockGetVisit: vi.fn(),
  mockCheckIn: vi.fn(),
  mockCheckOut: vi.fn(),
  mockDeleteVisit: vi.fn(),
  mockConfirmAction: vi.fn(),
}));

const { mockIssueToken } = vi.hoisted(() => ({ mockIssueToken: vi.fn() }));

vi.mock('../api/visits.api', () => ({
  getVisit: (id: number) => mockGetVisit(id),
  checkInVisit: (id: number) => mockCheckIn(id),
  checkOutVisit: (id: number) => mockCheckOut(id),
  deleteVisit: (id: number) => mockDeleteVisit(id),
}));
vi.mock('../api/safety-inductions.api', () => ({ issueInductionToken: (id: number) => mockIssueToken(id) }));

vi.mock('../api/client', () => ({
  apiClient: vi.fn(() => Promise.resolve({ id: 1, name: 'Admin', username: 'admin', role: 'ADMIN' })),
  userFacingError: () => 'Tidak dapat terhubung ke server.',
}));

vi.mock('../components/ConfirmationHost', () => ({
  ConfirmationHost: () => null,
  confirmAction: mockConfirmAction,
}));

function buildVisit(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    Id: 1,
    VisitCode: 'VIS-20260907-001',
    HostName: 'Budi Host',
    Purpose: 'Supplier Meeting',
    VisitDate: '2026-09-07',
    CheckInTime: null,
    CheckOutTime: null,
    Status: 'READY_FOR_CHECKIN',
    CreatedBy: 1,
    CheckedOutBy: null,
    CreatedAt: '2026-09-07T02:00:00Z',
    UpdatedAt: null,
    Company: { Id: 1, CompanyName: 'PT ABC' },
    Visitors: [
      { Id: 11, VisitorCode: 'VST-000011', VisitorName: 'Andi', PhoneNumber: null, SafetyStatus: 'VALID', ValidUntil: '2027-03-07' },
    ],
    SafetySummary: { totalVisitors: 1, cleared: 1, requiresInduction: 0 },
    ...overrides,
  };
}

function renderPage(status = 'READY_FOR_CHECKIN', visitors?: unknown[]) {
  const overrides: Record<string, unknown> = { Status: status };
  if (visitors) overrides.Visitors = visitors;
  const visit = buildVisit(overrides);
  mockGetVisit.mockResolvedValue(visit);
  return render(
    <LanguageProvider><AuthProvider>
      <MemoryRouter initialEntries={['/visits/1']}>
        <Routes>
          <Route path="/visits/:id" element={<VisitDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider></LanguageProvider>,
  );
}

describe('VisitDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockConfirmAction.mockResolvedValue(true);
    mockDeleteVisit.mockResolvedValue(undefined);
  });

  it('renders visit details', async () => {
    renderPage();
    expect(await screen.findByText('VIS-20260907-001')).toBeInTheDocument();
    expect(screen.getByText('PT ABC')).toBeInTheDocument();
    expect(screen.getAllByText('Andi')).toHaveLength(2);
  });

  it('shows Check In button for READY_FOR_CHECKIN', async () => {
    renderPage('READY_FOR_CHECKIN');
    await screen.findByText('VIS-20260907-001');
    expect(screen.getByText('Masuk')).toBeInTheDocument();
    expect(screen.getAllByText('Keluar')).toHaveLength(1);
  });

  it('deletes a visit from the Admin detail action', async () => {
    renderPage();
    await screen.findByText('VIS-20260907-001');
    fireEvent.click(screen.getByRole('button', { name: 'Hapus' }));
    await waitFor(() => expect(mockDeleteVisit).toHaveBeenCalledWith(1));
  });

  it('calls checkInVisit and refreshes status', async () => {
    const updated = buildVisit({ Status: 'IN', CheckInTime: '2026-09-07T02:30:00Z' });
    mockCheckIn.mockResolvedValue(updated);
    renderPage('READY_FOR_CHECKIN');
    await screen.findByText('VIS-20260907-001');
    fireEvent.click(screen.getByText('Masuk'));
    await waitFor(() => expect(mockCheckIn).toHaveBeenCalledWith(1));
    expect(screen.getByText('Visit is currently inside the facility.')).toBeInTheDocument();
    expect(screen.getAllByText('Keluar')).toHaveLength(2);
  });

  it('calls checkOutVisit for IN status', async () => {
    const updated = buildVisit({ Status: 'OUT', CheckInTime: '2026-09-07T02:30:00Z', CheckOutTime: '2026-09-07T04:00:00Z' });
    mockCheckOut.mockResolvedValue(updated);
    renderPage('IN', buildVisit().Visitors);
    await screen.findByText('VIS-20260907-001');
    fireEvent.click(screen.getAllByText('Keluar')[1]);
    await waitFor(() => expect(mockCheckOut).toHaveBeenCalledWith(1));
    expect(screen.getByText('Sudah Keluar')).toBeInTheDocument();
  });

  it('shows Start Safety Induction button when pending induction', async () => {
    renderPage('PENDING_INDUCTION', [
      { Id: 11, VisitorCode: 'VST-000011', VisitorName: 'Reza', PhoneNumber: null, SafetyStatus: 'REQUIRED', ValidUntil: null },
    ]);
    await screen.findByText('VIS-20260907-001');
    expect(screen.getByText('Mulai Safety Induction')).toBeInTheDocument();
  });

  it('shows an error when induction access cannot be created', async () => {
    mockIssueToken.mockRejectedValue(new Error('server unavailable'));
    renderPage('PENDING_INDUCTION', [
      { Id: 11, VisitorCode: 'VST-000011', VisitorName: 'Reza', PhoneNumber: null, SafetyStatus: 'REQUIRED', ValidUntil: null },
    ]);
    await screen.findByText('VIS-20260907-001');
    fireEvent.click(screen.getByText('Mulai Safety Induction'));
    expect(await screen.findByText('Tidak dapat terhubung ke server.')).toBeInTheDocument();
  });
});
