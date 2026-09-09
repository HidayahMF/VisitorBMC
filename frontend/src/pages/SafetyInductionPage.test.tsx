import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SafetyInductionPage } from './SafetyInductionPage';

const { mockGetActiveContents, mockCompleteGroupInduction, mockGetWorkflow } = vi.hoisted(() => ({
  mockGetActiveContents: vi.fn(),
  mockCompleteGroupInduction: vi.fn(),
  mockGetWorkflow: vi.fn(),
}));

vi.mock('../api/safety-inductions.api', () => ({
  getActiveInductionContents: () => mockGetActiveContents(),
  getInductionWorkflow: () => mockGetWorkflow(),
  completeGroupInduction: (data: unknown) => mockCompleteGroupInduction(data),
  getVisitorInductionHistory: vi.fn(() => Promise.resolve([])),
}));

const inductionData = {
  induction: { id: 1, title: 'Visitor Safety Induction', version: 1, validMonths: 6 },
  contents: [
    { Id: 1, SafetyInductionId: 1, ContentType: 'VIDEO', ContentUrl: '/uploads/a.mp4', Title: 'Intro Video', Description: 'First content', SortOrder: 1, IsRequired: true, CreatedAt: '' },
    { Id: 2, SafetyInductionId: 1, ContentType: 'IMAGE', ContentUrl: '/uploads/b.png', Title: 'Emergency Exits', Description: null, SortOrder: 2, IsRequired: true, CreatedAt: '' },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  mockGetActiveContents.mockResolvedValue(inductionData);
  mockGetWorkflow.mockResolvedValue({ visitId: 1, visitCode: 'VIS-1', visitors: [{ visitorId: 7, visitorName: 'Andi', safetyStatus: 'REQUIRED', needsInduction: true }], requiredCount: 1, completedCount: 0, remainingCount: 1, nextVisitorId: 7, status: 'PENDING_INDUCTION' });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/safety-induction/secure-test-token?total=999&completed=999']}>
      <Routes>
        <Route path="/safety-induction/:token" element={<SafetyInductionPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function finishCurrentVideo() {
  const video = document.querySelector('video');
  if (!video) throw new Error('Expected a video element');
  fireEvent.ended(video);
}

describe('SafetyInductionPage', () => {
  it('shows an empty state when no active content is configured', async () => {
    mockGetActiveContents.mockResolvedValue({ induction: inductionData.induction, contents: [] });
    renderPage();
    expect(await screen.findByText('Konten safety induction belum tersedia.')).toBeInTheDocument();
    expect(screen.queryByText('Content 1 of 0')).not.toBeInTheDocument();
  });

  it('shows the first content item after loading', async () => {
    renderPage();
    expect(await screen.findByText('Intro Video')).toBeInTheDocument();
    expect(screen.getByText('Safety Induction untuk seluruh grup')).toBeInTheDocument();
    expect(screen.getByText('0 / 1 Pengunjung selesai')).toBeInTheDocument();
  });

  it('navigates to next content', async () => {
    renderPage();
    await screen.findByText('Intro Video');
    finishCurrentVideo();
    fireEvent.click(screen.getByText('Next'));
    expect(await screen.findByText('Emergency Exits')).toBeInTheDocument();
    expect(screen.getByText('Safety Induction untuk seluruh grup')).toBeInTheDocument();
  });

  it('shows acknowledgement only after last content', async () => {
    renderPage();
    await screen.findByText('Intro Video');
    // Acknowledgement not visible on first content
    expect(screen.queryByText(/^Saya memastikan seluruh visitor/)).not.toBeInTheDocument();
    finishCurrentVideo();
    fireEvent.click(screen.getByText('Next'));
    await screen.findByText('Emergency Exits');
    expect(screen.getByText(/^Saya memastikan seluruh visitor/)).toBeInTheDocument();
  });

  it('disables Complete until acknowledged', async () => {
    renderPage();
    await screen.findByText('Intro Video');
    finishCurrentVideo();
    fireEvent.click(screen.getByText('Next'));
    await screen.findByText('Emergency Exits');
    const button = screen.getByText('Submit dan Check-in Grup') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(button.disabled).toBe(false));
  });

  it('submits and shows completion screen', async () => {
    mockCompleteGroupInduction.mockResolvedValue({ workflow: { status: 'IN' } });
    mockGetWorkflow.mockResolvedValueOnce({ visitId: 1, visitCode: 'VIS-1', visitors: [{ visitorId: 7, visitorName: 'Andi', safetyStatus: 'REQUIRED', needsInduction: true }], requiredCount: 1, completedCount: 0, remainingCount: 1, nextVisitorId: 7, status: 'PENDING_INDUCTION' });
    mockGetWorkflow.mockResolvedValueOnce({ visitId: 1, visitCode: 'VIS-1', visitors: [{ visitorId: 7, visitorName: 'Andi', safetyStatus: 'VALID', needsInduction: false }], requiredCount: 0, completedCount: 1, remainingCount: 0, nextVisitorId: null, status: 'READY_FOR_CHECKIN' });
    renderPage();
    await screen.findByText('Intro Video');
    finishCurrentVideo();
    fireEvent.click(screen.getByText('Next'));
    await screen.findByText('Emergency Exits');
    fireEvent.click(screen.getByRole('checkbox'));
    const button = screen.getByText('Submit dan Check-in Grup') as HTMLButtonElement;
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(await screen.findByText('Induction Complete')).toBeInTheDocument();
      expect(mockCompleteGroupInduction).toHaveBeenCalledWith({
      token: 'secure-test-token',
      visitorIds: [7],
      acknowledged: true,
    });
  });
});
