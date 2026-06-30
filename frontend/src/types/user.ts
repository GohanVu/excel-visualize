export type Role = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
  subscription?: {
    plan: 'free' | 'pro';
    status: string;
  } | null;
}
