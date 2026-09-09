import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VisitorsPage } from './VisitorsPage';
import { LanguageProvider } from '../i18n/LanguageContext';

const { mockListVisitors, mockListCompanies, mockDeleteVisitor, mockConfirmAction, mockAuth } = vi.hoisted(() => ({ mockListVisitors: vi.fn(), mockListCompanies: vi.fn(), mockDeleteVisitor: vi.fn(), mockConfirmAction: vi.fn(), mockAuth: vi.fn() }));
vi.mock('../api/visitors.api', () => ({ listVisitors: (params: unknown) => mockListVisitors(params), deleteVisitor: (id: number) => mockDeleteVisitor(id) }));
vi.mock('../api/companies.api', () => ({ listCompanies: (params: unknown) => mockListCompanies(params) }));
vi.mock('../context/AuthContext', () => ({ useAuth: mockAuth }));
vi.mock('../components/Layout', () => ({ Layout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('../components/ConfirmationHost', () => ({ confirmAction: mockConfirmAction }));

const visitor = { id: 1, visitorCode: 'VST-000001', visitorName: 'Habibi', phoneNumber: null, isActive: true, createdAt: '2026-09-08', updatedAt: null, company: { id: 2, companyName: 'PT BMC' } };
function renderPage() { return render(<MemoryRouter><LanguageProvider><VisitorsPage /></LanguageProvider></MemoryRouter>); }

describe('VisitorsPage', () => {
  beforeEach(() => { vi.resetAllMocks(); window.localStorage.setItem('visitorbmc.language', 'id'); mockAuth.mockReturnValue({ user: { role: 'SECURITY', name: 'Security' } }); mockConfirmAction.mockResolvedValue(true); mockListCompanies.mockResolvedValue({ data: [{ id: 2, companyName: 'PT BMC' }] }); mockListVisitors.mockResolvedValue({ data: [visitor], pagination: { total: 1 } }); mockDeleteVisitor.mockResolvedValue(undefined); });
  it('renders lookup controls and visitor data in Indonesian', async () => { renderPage(); expect(await screen.findByRole('heading', { name: 'Pengunjung yang sudah terdaftar' })).toBeInTheDocument(); expect(screen.getByText('Kelola data pengunjung yang terdaftar.')).toBeInTheDocument(); expect(screen.getByRole('searchbox')).toHaveAttribute('placeholder', 'Cari nama atau kode...'); expect(screen.getByLabelText('Perusahaan')).toBeInTheDocument(); expect(screen.getByText('1 pengunjung')).toBeInTheDocument(); expect(screen.getAllByText('Habibi')).toHaveLength(2); expect(screen.getAllByText('Lihat')).toHaveLength(2); });
  it('shows the delete action to Admin but not Security', async () => { renderPage(); expect(await screen.findAllByRole('button', { name: 'Lihat' })).toHaveLength(2); expect(screen.queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument(); mockAuth.mockReturnValue({ user: { role: 'ADMIN', name: 'Admin' } }); renderPage(); expect(await screen.findAllByRole('button', { name: 'Hapus' })).toHaveLength(2); });
  it('uses the English delete label for Admin', async () => { window.localStorage.setItem('visitorbmc.language', 'en'); mockAuth.mockReturnValue({ user: { role: 'ADMIN', name: 'Admin' } }); renderPage(); expect(await screen.findAllByRole('button', { name: 'Delete' })).toHaveLength(2); });
  it('opens confirmation and deletes only after confirmation', async () => { mockAuth.mockReturnValue({ user: { role: 'ADMIN', name: 'Admin' } }); renderPage(); fireEvent.click((await screen.findAllByRole('button', { name: 'Hapus' }))[0]); await waitFor(() => expect(mockConfirmAction).toHaveBeenCalledWith('Hapus data?\nHabibi\nData ini akan dihapus.', { confirmLabel: 'Hapus', cancelLabel: 'Batal' })); expect(mockDeleteVisitor).toHaveBeenCalledWith(1); });
  it('does not delete when confirmation is cancelled', async () => { mockAuth.mockReturnValue({ user: { role: 'ADMIN', name: 'Admin' } }); mockConfirmAction.mockResolvedValue(false); renderPage(); fireEvent.click((await screen.findAllByRole('button', { name: 'Hapus' }))[0]); await waitFor(() => expect(mockConfirmAction).toHaveBeenCalled()); expect(mockDeleteVisitor).not.toHaveBeenCalled(); });
  it('passes visitor search and company filter and offers reset', async () => { renderPage(); const search = screen.getByRole('searchbox'); fireEvent.change(search, { target: { value: 'VST-000001' } }); await waitFor(() => expect(mockListVisitors).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'VST-000001', page: 1 }))); fireEvent.change(screen.getByLabelText('Perusahaan'), { target: { value: '2' } }); await waitFor(() => expect(mockListVisitors).toHaveBeenLastCalledWith(expect.objectContaining({ companyId: 2 }))); expect(screen.getByText('Reset filter')).toBeInTheDocument(); fireEvent.click(screen.getByText('Reset filter')); expect(search).toHaveValue(''); });
  it('distinguishes search-empty and loading states', async () => { mockListVisitors.mockResolvedValue({ data: [], pagination: { total: 0 } }); renderPage(); fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Habibi' } }); expect(await screen.findByText('Tidak ada pengunjung yang sesuai dengan "Habibi".')).toBeInTheDocument(); mockListVisitors.mockReturnValue(new Promise(() => undefined)); });
});
