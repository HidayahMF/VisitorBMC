import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SecurityDashboardPage } from './dashboard';

const { mockFetchOverview, mockReturnTravel } = vi.hoisted(() => ({
  mockFetchOverview: vi.fn(),
  mockReturnTravel: vi.fn(),
}));

vi.mock('../api', () => ({
  fetchOverview: mockFetchOverview,
  returnTravel: mockReturnTravel,
}));

const overview = {
  counts: { travel: 1, izin: 0, kembali: 0 },
  travel: [{ id: 201, nip: '1021', nama: 'Andi Saputra', tujuan: 'PT Supplier Timur', keperluan: 'Pengambilan material', jamKeluar: '08:00', status: 'SEDANG_TUGAS_LUAR', departureTime: '08:10' }],
  izin: [],
  kembali: [],
};

describe('SecurityDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchOverview.mockResolvedValue(overview);
    mockReturnTravel.mockResolvedValue(undefined);
  });

  it('mencatat karyawan kembali dari dashboard setelah konfirmasi', async () => {
    render(<SecurityDashboardPage />);

    await screen.findByRole('button', { name: 'Catat Kembali' });
    fireEvent.click(screen.getByRole('button', { name: 'Catat Kembali' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ya, Catat Kembali' }));

    await waitFor(() => expect(mockReturnTravel).toHaveBeenCalledWith(201, '1021', expect.stringMatching(/^([01]\d|2[0-3]):[0-5]\d$/)));
  });
});
