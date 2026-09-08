import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../i18n/LanguageContext';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';

const { mockStats, mockVisits } = vi.hoisted(() => ({ mockStats: vi.fn(), mockVisits: vi.fn() }));
vi.mock('../api/visits.api', () => ({ getDashboardStats: () => mockStats(), listVisits: (params: unknown) => mockVisits(params) }));
vi.mock('../components/Layout', () => ({ Layout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

const stats = { visitorsToday: 5, currentlyInside: 3, checkedOutToday: 2, inductionRequiredToday: 2 };
const pagination = { page: 1, limit: 8, total: 1, totalPages: 1 };

describe('DashboardPage', () => {
  beforeEach(() => { vi.resetAllMocks(); mockStats.mockResolvedValue(stats); mockVisits.mockResolvedValue({ data: [{ Id: 12, VisitCode: 'VIS-001', CompanyName: 'PT BMC', HostName: 'Hidayah', VisitorCount: 3, Status: 'IN' }], pagination }); });
  it('shows people-based KPIs, recent activity, and attention', async () => { render(<MemoryRouter><LanguageProvider><DashboardPage /></LanguageProvider></MemoryRouter>); expect(await screen.findByText('Pengunjung Hari Ini')).toBeInTheDocument(); expect(screen.getByText('5')).toBeInTheDocument(); expect(screen.getAllByText('orang')).toHaveLength(3); expect(screen.getByText('Aktivitas Hari Ini')).toBeInTheDocument(); expect(screen.getByText('VIS-001')).toBeInTheDocument(); expect(screen.getByText('Perlu Perhatian')).toBeInTheDocument(); expect(screen.getByText('2 pengunjung')).toBeInTheDocument(); });
  it('shows a calm attention state when no induction is required', async () => { mockStats.mockResolvedValue({ ...stats, inductionRequiredToday: 0 }); render(<MemoryRouter><LanguageProvider><DashboardPage /></LanguageProvider></MemoryRouter>); expect(await screen.findByText('Tidak ada tindakan pengunjung yang perlu diperhatikan saat ini.')).toBeInTheDocument(); });
  it('does not render zero KPIs while the request is loading', () => { mockStats.mockReturnValue(new Promise(() => undefined)); mockVisits.mockReturnValue(new Promise(() => undefined)); render(<MemoryRouter><LanguageProvider><DashboardPage /></LanguageProvider></MemoryRouter>); expect(screen.getByText('Memuat...')).toBeInTheDocument(); expect(screen.queryByText('0')).not.toBeInTheDocument(); });
});
