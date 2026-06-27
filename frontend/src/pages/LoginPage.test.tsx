import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import client from '../api/client';

vi.mock('../api/client');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

const mockedPost = vi.mocked(client.post);

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders app name', () => {
    renderPage();
    expect(screen.getByText('ChartLy')).toBeInTheDocument();
  });

  it('renders Google sign-in button', () => {
    renderPage();
    const btn = screen.getByTestId('google-signin-btn');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('Đăng nhập bằng Google');
  });

  it('Google button points to /api/auth/google', () => {
    renderPage();
    expect(screen.getByTestId('google-signin-btn')).toHaveAttribute('href', '/api/auth/google');
  });

  it('renders tagline in Vietnamese', () => {
    renderPage();
    expect(screen.getByText(/Xem dữ liệu Excel dưới dạng biểu đồ/i)).toBeInTheDocument();
  });

  it('renders login form with email and password fields', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Mật khẩu/i)).toBeInTheDocument();
  });

  it('switches to register mode and shows name field', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));
    expect(screen.getByPlaceholderText('Họ tên')).toBeInTheDocument();
  });

  it('shows error message on failed login', async () => {
    mockedPost.mockRejectedValue({ response: { data: { message: 'Email hoặc mật khẩu không đúng' } } });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Mật khẩu/i), { target: { value: 'wrongpass' } });
    fireEvent.submit(screen.getByRole('form'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Email hoặc mật khẩu không đúng'));
  });

  it('calls /auth/login on submit', async () => {
    mockedPost.mockResolvedValue({ data: {} });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Mật khẩu/i), { target: { value: 'secret123' } });
    fireEvent.submit(screen.getByRole('form'));
    await waitFor(() => expect(mockedPost).toHaveBeenCalledWith('/auth/login', { email: 'user@example.com', password: 'secret123' }));
  });
});
