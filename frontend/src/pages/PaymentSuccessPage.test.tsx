import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import PaymentSuccessPage from './PaymentSuccessPage';
import { getTransactionStatus } from '../api/payments';
import { useAuth } from '../hooks/useAuth';

vi.mock('../api/payments');
vi.mock('../hooks/useAuth');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: vi.fn(),
  };
});
vi.mock('@tanstack/react-query', () => {
  return {
    useQueryClient: vi.fn(),
  };
});

const mockGetTransactionStatus = vi.mocked(getTransactionStatus);
const mockUseSearchParams = vi.mocked(useSearchParams);
const mockUseQueryClient = vi.mocked(useQueryClient);
const mockUseAuth = vi.mocked(useAuth);

function renderPage() {
  return render(
    <MemoryRouter>
      <PaymentSuccessPage />
    </MemoryRouter>,
  );
}

describe('PaymentSuccessPage', () => {
  let mockQueryClientInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryClientInstance = {
      invalidateQueries: vi.fn(),
    };
    mockUseQueryClient.mockReturnValue(mockQueryClientInstance);
    mockUseSearchParams.mockReturnValue([new URLSearchParams('?orderCode=123456'), vi.fn()]);
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-123',
        name: 'Gohan Vu',
        email: 'gohan@example.com',
        role: 'user',
        createdAt: '2026-06-30T00:00:00Z',
        updatedAt: '2026-06-30T00:00:00Z',
        googleConnected: false,
        subscription: {
          plan: 'free',
          status: 'active',
        },
      },
      loading: false,
      refetch: vi.fn(),
    } as any);
  });

  it('shows loading state initially', async () => {
    mockGetTransactionStatus.mockReturnValue(new Promise(() => {})); // Keep loading state
    renderPage();
    expect(screen.getByText('Đang xác nhận giao dịch...')).toBeInTheDocument();
  });

  it('displays success state when payment is PAID', async () => {
    mockGetTransactionStatus.mockResolvedValue({
      orderCode: 123456,
      status: 'PAID',
      amount: 99000,
      durationMonths: 1,
      updatedAt: '',
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Thanh Toán Thành Công!')).toBeInTheDocument();
      expect(screen.getByText(/Tài khoản của bạn đã được nâng cấp lên/i)).toBeInTheDocument();
      expect(mockQueryClientInstance.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['auth', 'me'] });
    });
  });

  it('displays error state when payment is CANCELLED', async () => {
    mockGetTransactionStatus.mockResolvedValue({
      orderCode: 123456,
      status: 'CANCELLED',
      amount: 99000,
      durationMonths: 1,
      updatedAt: '',
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Giao dịch thất bại hoặc đã hủy')).toBeInTheDocument();
    });
  });
});
