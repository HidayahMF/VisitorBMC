import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConnectionStatus } from './ConnectionStatus';

const { mockApi } = vi.hoisted(() => ({ mockApi: vi.fn() }));
vi.mock('../api/client', () => ({ apiClient: mockApi }));

describe('ConnectionStatus', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('hides the banner while healthy', async () => { mockApi.mockResolvedValue({}); render(<ConnectionStatus />); await waitFor(() => expect(mockApi).toHaveBeenCalledWith('/health')); expect(screen.queryByRole('alert')).not.toBeInTheDocument(); });
  it('shows and clears the banner after retry reconnects', async () => { mockApi.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({}); render(<ConnectionStatus />); expect(await screen.findByText(/Koneksi ke server terputus/)).toBeInTheDocument(); fireEvent.click(screen.getByText('Coba Lagi')); await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument()); });
});
