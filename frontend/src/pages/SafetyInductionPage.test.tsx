import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SafetyInductionPage } from './SafetyInductionPage';

const { mockGetActiveContents, mockCompleteInduction } = vi.hoisted(() => ({
  mockGetActiveContents: vi.fn(),
  mockCompleteInduction: vi.fn(),
}));

vi.mock('../api/safety-inductions.api', () => ({
  getActiveInductionContents: () => mockGetActiveContents(),
  completeInduction: (data: unknown) => mockCompleteInduction(data),
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
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/safety-induction/1?visitorId=7&total=5&completed=1']}>
      <Routes>
        <Route path="/safety-induction/:visitId" element={<SafetyInductionPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SafetyInductionPage', () => {
  it('shows the first content item after loading', async () => {
    renderPage();
    expect(await screen.findByText('Intro Video')).toBeInTheDocument();
    expect(screen.getByText('Content 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('1 / 5 Completed')).toBeInTheDocument();
  });

  it('navigates to next content', async () => {
    renderPage();
    await screen.findByText('Intro Video');
    fireEvent.click(screen.getByText('Next'));
    expect(await screen.findByText('Emergency Exits')).toBeInTheDocument();
    expect(screen.getByText('Content 2 of 2')).toBeInTheDocument();
  });

  it('shows acknowledgement only after last content', async () => {
    renderPage();
    await screen.findByText('Intro Video');
    // Acknowledgement not visible on first content
    expect(screen.queryByText(/^Saya sudah melihat/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Next'));
    await screen.findByText('Emergency Exits');
    expect(screen.getByText(/^Saya sudah melihat/)).toBeInTheDocument();
  });

  it('disables Complete until acknowledged', async () => {
    renderPage();
    await screen.findByText('Intro Video');
    fireEvent.click(screen.getByText('Next'));
    await screen.findByText('Emergency Exits');
    const button = screen.getByText('Complete Induction') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(button.disabled).toBe(false));
  });

  it('submits and shows completion screen', async () => {
    mockCompleteInduction.mockResolvedValue({ recordId: 10, validUntil: '2027-03-07' });
    renderPage();
    await screen.findByText('Intro Video');
    fireEvent.click(screen.getByText('Next'));
    await screen.findByText('Emergency Exits');
    fireEvent.click(screen.getByRole('checkbox'));
    const button = screen.getByText('Complete Induction') as HTMLButtonElement;
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(await screen.findByText('Induction Complete')).toBeInTheDocument();
    expect(mockCompleteInduction).toHaveBeenCalledWith({
      visitorId: 7,
      visitId: 1,
      acknowledged: true,
    });
  });
});