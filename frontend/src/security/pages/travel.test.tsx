import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SecurityTravelPage } from './travel';

const { mockFetchOverview, mockDepartTravel, mockReturnTravel } = vi.hoisted(() => ({ mockFetchOverview: vi.fn(), mockDepartTravel: vi.fn(), mockReturnTravel: vi.fn() }));

vi.mock('../api', () => ({
  fetchOverview: mockFetchOverview,
  fetchReport: vi.fn(),
  departTravel: mockDepartTravel,
  returnTravel: mockReturnTravel,
  scanTravel: vi.fn(),
}));

vi.mock('qr-scanner', () => ({
  default: class QrScanner {},
}));

const overview = {
  counts: { travel: 4, izin: 0, kembali: 0 },
  travel: [
    { id: 201, nip: '1021', nama: 'Andi Saputra', tujuan: 'PT Supplier Timur', keperluan: 'Pengambilan material', jamKeluar: '08:00', status: 'SEDANG_TUGAS_LUAR', departureTime: '08:10', jenisTugas: 'MANDIRI' },
    { id: 'GRP-01', nip: '1021, 1044', nama: 'Andi Saputra, Budi Hartono', groupCode: 'GRP-01', members: [{ nip: '1021', nama: 'Andi Saputra' }, { nip: '1044', nama: 'Budi Hartono' }], tujuan: 'Gudang B', keperluan: 'Pengiriman', jamKeluar: '09:00', kendaraan: 'VAN', platNomor: 'B 2', pengemudi: '1001', qrToken: 'QR-GRP-01', status: 'AKAN_TUGAS_LUAR', canDepart: true, jenisTugas: 'GROUP' },
    { id: 'GRP-02', nip: '1022, 1045', nama: 'Citra Dewi, Deni Putra', groupCode: 'GRP-02', members: [{ nip: '1022', nama: 'Citra Dewi' }, { nip: '1045', nama: 'Deni Putra' }], tujuan: 'PT SIMF', keperluan: 'Operasional', jamKeluar: '07:10', departureTime: '11:07', kendaraan: 'OFFICE', platNomor: 'B 2405 KRM', pengemudi: 'ORANG', qrToken: 'QR-GRP-02', status: 'SEDANG_TUGAS_LUAR', jenisTugas: 'GROUP' },
    { id: 'GRP-03', nip: '1023, 1046', nama: 'Eka Putri, Fajar Noor', groupCode: 'GRP-03', members: [{ nip: '1023', nama: 'Eka Putri' }, { nip: '1046', nama: 'Fajar Noor' }], tujuan: 'Gudang C', keperluan: 'Kirim', jamKeluar: '10:00', kendaraan: 'TRUCK', platNomor: 'B 3', status: 'AKAN_TUGAS_LUAR', canDepart: false, jenisTugas: 'GROUP' },
  ],
  izin: [],
  kembali: [],
};

describe('SecurityTravelPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchOverview.mockResolvedValue(overview);
  });

  it('menampilkan tugas mandiri dan group dalam presentasi responsif', async () => {
    render(<SecurityTravelPage />);

    await waitFor(() => expect(mockFetchOverview).toHaveBeenCalled());
    expect(document.querySelector('.security-travel-desktop')).toBeInTheDocument();
    expect(document.querySelector('.security-travel-mobile')).toBeInTheDocument();
    expect(document.querySelectorAll('.security-travel-card')).toHaveLength(4);
    expect(screen.getAllByText('GRP-01')).toHaveLength(2);
    expect(screen.getAllByText('GRP-02')).toHaveLength(2);
    expect(screen.getAllByText('Menunggu approval kendaraan')).toHaveLength(2);
    expect(screen.getAllByText('QR-GRP-01')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Catat Berangkat' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Catat Kembali' })).toHaveLength(4);
    mockDepartTravel.mockResolvedValue(undefined);
    await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: 'Catat Berangkat' })[1]); });
    await waitFor(() => expect(screen.getByText('Konfirmasi Keberangkatan')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ya, Catat Berangkat' })); });
    await waitFor(() => expect(mockDepartTravel).toHaveBeenCalledWith('GRP-01', '', expect.stringMatching(/^([01]\d|2[0-3]):[0-5]\d$/)));
    await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: 'Catat Kembali' })[1]); });
    await waitFor(() => expect(screen.getByText('Konfirmasi Kepulangan')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ya, Catat Kembali' })); });
    await waitFor(() => expect(mockReturnTravel).toHaveBeenCalledWith('GRP-02', '1022, 1045', expect.stringMatching(/^([01]\d|2[0-3]):[0-5]\d$/)));
  });
});
