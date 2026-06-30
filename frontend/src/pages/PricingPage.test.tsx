import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PricingPage from './PricingPage';
import { createPaymentLink } from '../api/payments';
import { useAuth } from '../hooks/useAuth';

vi.mock('../api/payments');
vi.mock('../hooks/useAuth');

const mockCreatePaymentLink = vi.mocked(createPaymentLink);
const mockUseAuth = vi.mocked(useAuth);

function renderPage() {
  return render(
    <MemoryRouter>
      <PricingPage />
    </MemoryRouter>,
  );
}

describe('PricingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('renders package selection title and description', () => {
    renderPage();
    expect(screen.getByText('Nâng Cấp Tài Khoản Pro')).toBeInTheDocument();
    expect(screen.getByText(/Mở khóa toàn bộ sức mạnh của AI/i)).toBeInTheDocument();
  });

  it('renders 4 packages with correct names and savings labels', () => {
    renderPage();
    expect(screen.getByText('Gói 1 Tháng')).toBeInTheDocument();
    expect(screen.getByText('Gói 3 Tháng')).toBeInTheDocument();
    expect(screen.getByText('Gói 6 Tháng')).toBeInTheDocument();
    expect(screen.getByText('Gói 1 Năm')).toBeInTheDocument();
    
    expect(screen.getByText('Tiết kiệm 15%')).toBeInTheDocument();
    expect(screen.getByText('Tiết kiệm 25%')).toBeInTheDocument();
    expect(screen.getByText('Tiết kiệm 33%')).toBeInTheDocument();
  });

  it('renders action buttons for upgrade', () => {
    renderPage();
    const upgradeBtns = screen.getAllByRole('button', { name: 'Nâng cấp ngay' });
    expect(upgradeBtns.length).toBe(4);
  });

  it('calls createPaymentLink when user clicks upgrade', async () => {
    mockCreatePaymentLink.mockResolvedValue({
      orderCode: 123456,
      checkoutUrl: 'https://checkout.payos.vn/pay/123456',
      amount: 99000,
      durationMonths: 1,
    });
    
    // Mock window.location
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { href: '' } as any;

    renderPage();
    
    const firstUpgradeBtn = screen.getAllByRole('button', { name: 'Nâng cấp ngay' })[0];
    fireEvent.click(firstUpgradeBtn);

    await waitFor(() => {
      expect(mockCreatePaymentLink).toHaveBeenCalledWith(1);
      expect(window.location.href).toBe('https://checkout.payos.vn/pay/123456');
    });

    // Reset window.location
    window.location = originalLocation;
  });
});
