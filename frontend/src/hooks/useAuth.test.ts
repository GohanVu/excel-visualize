import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useAuth } from './useAuth';
import client from '../api/client';

vi.mock('../api/client');

const mockedGet = vi.mocked(client.get);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: qc }, children);
}

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test',
  avatarUrl: null,
  role: 'user' as const,
  createdAt: '',
  updatedAt: '',
};

describe('useAuth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns user when /auth/me succeeds', async () => {
    mockedGet.mockResolvedValue({ data: mockUser });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('returns null when /auth/me returns 401', async () => {
    mockedGet.mockRejectedValue({ response: { status: 401 } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('isLoading is true initially', () => {
    mockedGet.mockResolvedValue({ data: mockUser });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });
});
