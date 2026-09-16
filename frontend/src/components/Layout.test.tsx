import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: mockAuth }));
vi.mock('../i18n/LanguageContext', () => ({ useLanguage: () => ({ language: 'id', setLanguage: vi.fn(), t: (key: string) => ({ 'navigation.dashboard': 'Dasbor', 'navigation.companies': 'Perusahaan', 'navigation.visitors': 'Pengunjung', 'navigation.visits': 'Kunjungan', 'navigation.inside': 'Di Dalam', 'navigation.administration': 'Administrasi', 'navigation.safetyContent': 'Konten Safety', 'navigation.auditLog': 'Audit Log', 'navigation.reports': 'Laporan', 'navigation.configuration': 'Konfigurasi', 'navigation.users': 'Pengguna', 'navigation.logout': 'Keluar', 'navigation.main': 'Utama', 'language.label': 'Bahasa', 'language.switchToEnglish': 'Ganti bahasa ke Inggris', 'language.switchToIndonesian': 'Ganti bahasa ke Bahasa Indonesia' }[key] ?? key), formatDate: (value: Date) => String(value) }) }));
vi.mock('./ConnectionStatus', () => ({ ConnectionStatus: () => null }));
vi.mock('./ConfirmationHost', () => ({ ConfirmationHost: () => null }));

function renderLayout(role: 'ADMIN' | 'SECURITY' | 'MONITORING', path = '/dashboard') {
  mockAuth.mockReturnValue({ user: { name: 'Hidayah Muhammad Fadillah', role }, logout: vi.fn() });
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="*" element={<Layout><p>Isi</p></Layout>} /></Routes></MemoryRouter>);
}

describe('Layout navigation', () => {
  it('groups admin links and shows active administration on child routes', () => {
    renderLayout('ADMIN', '/audit-log');
    expect(screen.getByText('Administrasi')).toHaveClass('is-active');
    expect(screen.getByRole('button', { name: /Administrasi/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Audit Log').closest('.admin-nav-dropdown')).not.toHaveClass('is-open');
    fireEvent.click(screen.getByRole('button', { name: /Administrasi/ }));
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Administrasi/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Pengguna')).toBeInTheDocument();
  });

  it('shows reports and safety content for Security and exposes profile menu', () => {
    renderLayout('SECURITY');
    expect(screen.getByText('Administrasi')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Administrasi'));
    expect(screen.getByText('Konten Safety')).toBeInTheDocument();
    expect(screen.getByText('Laporan')).toBeInTheDocument();
    expect(screen.queryByText('Pengguna')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Hidayah Muhammad Fadillah'));
    expect(screen.getByText('Keluar')).toBeInTheDocument();
  });

  it('shows reports and safety content for Monitoring in administration', () => {
    renderLayout('MONITORING');
    fireEvent.click(screen.getByText('Administrasi'));
    expect(screen.getByText('Laporan')).toBeInTheDocument();
    expect(screen.getByText('Konten Safety')).toBeInTheDocument();
    expect(screen.queryByText('Pengguna')).not.toBeInTheDocument();
  });
});
