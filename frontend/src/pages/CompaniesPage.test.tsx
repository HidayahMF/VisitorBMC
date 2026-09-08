import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CompaniesPage } from './CompaniesPage';
import { LanguageProvider } from '../i18n/LanguageContext';

const { mockListCompanies } = vi.hoisted(() => ({ mockListCompanies: vi.fn() }));
vi.mock('../api/companies.api', () => ({ listCompanies: (params: unknown) => mockListCompanies(params), deleteCompany: vi.fn(), updateCompanyStatus: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'ADMIN', name: 'Admin' } }) }));
vi.mock('../components/Layout', () => ({ Layout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('../components/ConfirmationHost', () => ({ confirmAction: () => Promise.resolve(true) }));

const company = { id: 1, companyName: 'Bakrie Autoparts', isActive: true };
function renderPage() { return render(<MemoryRouter><LanguageProvider><CompaniesPage /></LanguageProvider></MemoryRouter>); }

describe('CompaniesPage', () => {
  beforeEach(() => { vi.resetAllMocks(); mockListCompanies.mockResolvedValue({ data: [company], pagination: { total: 1 } }); });
  it('renders localized header, result count, status, and edit affordance', async () => { renderPage(); expect(await screen.findByText('Perusahaan')).toBeInTheDocument(); expect(screen.getByText('Kelola perusahaan yang terdaftar untuk kunjungan pengunjung.')).toBeInTheDocument(); expect(screen.getByText('1 perusahaan')).toBeInTheDocument(); expect(screen.getAllByText('Aktif').length).toBeGreaterThan(0); expect(screen.getAllByRole('button', { name: 'Bakrie Autoparts' }).length).toBeGreaterThan(0); });
  it('keeps the search discoverable in Indonesian', async () => { renderPage(); const search = screen.getByRole('searchbox'); expect(search).toHaveAttribute('placeholder', 'Cari nama perusahaan...'); });
  it('shows search-specific empty state', async () => { mockListCompanies.mockResolvedValue({ data: [], pagination: { total: 0 } }); renderPage(); fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'XYZ' } }); expect(await screen.findByText('Tidak ada perusahaan yang sesuai dengan pencarian. "XYZ".')).toBeInTheDocument(); });
  it('distinguishes loading from an empty result', () => { mockListCompanies.mockReturnValue(new Promise(() => undefined)); renderPage(); expect(screen.getByText('Memuat...')).toBeInTheDocument(); expect(screen.queryByText('0 perusahaan')).not.toBeInTheDocument(); });
});
