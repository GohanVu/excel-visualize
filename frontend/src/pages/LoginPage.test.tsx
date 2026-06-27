import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoginPage from './LoginPage';

describe('LoginPage', () => {
  it('renders app name', () => {
    render(<LoginPage />);
    expect(screen.getByText('ChartLy')).toBeInTheDocument();
  });

  it('renders Google sign-in button', () => {
    render(<LoginPage />);
    const btn = screen.getByTestId('google-signin-btn');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('Đăng nhập bằng Google');
  });

  it('Google button points to /api/auth/google', () => {
    render(<LoginPage />);
    const btn = screen.getByTestId('google-signin-btn');
    expect(btn).toHaveAttribute('href', '/api/auth/google');
  });

  it('renders tagline in Vietnamese', () => {
    render(<LoginPage />);
    expect(
      screen.getByText(/Xem dữ liệu Excel dưới dạng biểu đồ/i),
    ).toBeInTheDocument();
  });
});
