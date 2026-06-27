import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import type { User } from '../types/user';

async function fetchMe(): Promise<User> {
  const { data } = await client.get<User>('/auth/me');
  return data;
}

export function useAuth() {
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user && !isError,
  };
}
