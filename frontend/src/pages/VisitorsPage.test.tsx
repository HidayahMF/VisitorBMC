import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VisitorsPage } from './VisitorsPage';
import { LanguageProvider } from '../i18n/LanguageContext';

const { mockListVisitors, mockListCompanies } = vi.hoisted(() => ({ mockListVisitors: vi.fn(), mockListCompanies: vi.fn() }));
vi.mock('../api/visitors.api', () => ({ listVisitors: (params: unknown) => mockListVisitors(params), deleteVisitor: vi.fn() }));
vi.mock('../api/companies.api', () => ({ listCompanies: (params: unknown) => mockListCompanies(params) }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'SECURITY', name: 'Security' } }) }));
vi.mock('../components/Layout', () => ({ Layout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('../components/ConfirmationHost', () => ({ confirmAction: () => Promise.resolve(true) }));

const visitor = { id: 1, visitorCode: 'VST-000001', visitorName: 'Habibi', phoneNumber: null, isActive: true, createdAt: '2026-09-08', updatedAt: null, company: { id: 2, companyName: 'PT BMC' } };
function renderPage() { return render(<MemoryRouter><LanguageProvider><VisitorsPage /></LanguageProvider></MemoryRouter>); }

describe('VisitorsPage', () => {
  beforeEach(() => { vi.resetAllMocks(); mockListCompanies.mockResolvedValue({ data: [{ id: 2, companyName: 'PT BMC' }] }); mockListVisitors.mockResolvedValue({ data: [visitor], pagination: { total: 1 } }); });
  it('renders lookup controls and visitor data in Indonesian', async () => { renderPage(); expect(await screen.findByRole('heading', { name: 'Pengunjung' })).toBeInTheDocument(); expect(screen.getByText('Kelola data pengunjung yang terdaftar.')).toBeInTheDocument(); expect(screen.getByRole('searchbox')).toHaveAttribute('placeholder', 'Cari nama atau kode...'); expect(screen.getByLabelText('Perusahaan')).toBeInTheDocument(); expect(screen.getByText('1 pengunjung')).toBeInTheDocument(); expect(screen.getAllByText('Habibi')).toHaveLength(2); expect(screen.getAllByText('Lihat')).toHaveLength(2); });
  it('passes visitor search and company filter and offers reset', async () => { renderPage(); const search = screen.getByRole('searchbox'); fireEvent.change(search, { target: { value: 'VST-000001' } }); await waitFor(() => expect(mockListVisitors).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'VST-000001', page: 1 }))); fireEvent.change(screen.getByLabelText('Perusahaan'), { target: { value: '2' } }); await waitFor(() => expect(mockListVisitors).toHaveBeenLastCalledWith(expect.objectContaining({ companyId: 2 }))); expect(screen.getByText('Reset filter')).toBeInTheDocument(); fireEvent.click(screen.getByText('Reset filter')); expect(search).toHaveValue(''); });
  it('distinguishes search-empty and loading states', async () => { mockListVisitors.mockResolvedValue({ data: [], pagination: { total: 0 } }); renderPage(); fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Habibi' } }); expect(await screen.findByText('Tidak ada pengunjung yang sesuai dengan "Habibi".')).toBeInTheDocument(); mockListVisitors.mockReturnValue(new Promise(() => undefined)); });
});
