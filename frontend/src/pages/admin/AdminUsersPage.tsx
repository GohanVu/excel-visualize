import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import { useState } from 'react';

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  createdAt: string;
  subscription: {
    plan: 'free' | 'pro';
    status: string;
  } | null;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const { data: users, isLoading, isError } = useQuery<UserItem[]>({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data } = await client.get<UserItem[]>('/admin/users');
      return data;
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ userId, plan }: { userId: string; plan: 'free' | 'pro' }) => {
      setUpdatingUserId(userId);
      const { data } = await client.patch(`/admin/users/${userId}/plan`, { plan });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setUpdatingUserId(null);
    },
    onError: () => {
      alert('Cập nhật gói thất bại!');
      setUpdatingUserId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (isError || !users) {
    return (
      <div className="text-center text-red-400 p-8 border border-red-500/20 bg-red-500/5 rounded-xl">
        Không thể tải danh sách người dùng. Vui lòng thử lại sau.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/50 text-gray-400 text-xs font-semibold uppercase tracking-wider">
              <th className="py-4 px-6">Người dùng</th>
              <th className="py-4 px-6">Vai trò</th>
              <th className="py-4 px-6">Gói hiện tại</th>
              <th className="py-4 px-6">Ngày tham gia</th>
              <th className="py-4 px-6 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-sm">
            {users.map((u) => {
              const currentPlan = u.subscription?.plan || 'free';
              const isUpdating = updatingUserId === u.id;

              return (
                <tr key={u.id} className="hover:bg-gray-850/30 transition-colors">
                  {/* User Info */}
                  <td className="py-4 px-6 flex items-center space-x-3">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="Avatar" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center font-bold text-gray-300">
                        {u.name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-white">{u.name || 'Người dùng'}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="py-4 px-6">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        u.role === 'admin'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}
                    >
                      {u.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>

                  {/* Plan */}
                  <td className="py-4 px-6">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        currentPlan === 'pro'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}
                    >
                      {currentPlan.toUpperCase()}
                    </span>
                  </td>

                  {/* Join Date */}
                  <td className="py-4 px-6 text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-6 text-right">
                    {u.role !== 'admin' && (
                      <div className="inline-flex items-center space-x-2">
                        {currentPlan === 'free' ? (
                          <button
                            disabled={isUpdating}
                            onClick={() => updatePlanMutation.mutate({ userId: u.id, plan: 'pro' })}
                            className="text-xs font-medium text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-400 px-2.5 py-1.5 rounded-lg bg-amber-500/5 hover:bg-amber-500/10 transition-all disabled:opacity-50"
                          >
                            {isUpdating ? 'Đang xử lý...' : 'Nâng cấp PRO'}
                          </button>
                        ) : (
                          <button
                            disabled={isUpdating}
                            onClick={() => updatePlanMutation.mutate({ userId: u.id, plan: 'free' })}
                            className="text-xs font-medium text-gray-400 hover:text-gray-300 border border-gray-700 hover:border-gray-600 px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all disabled:opacity-50"
                          >
                            {isUpdating ? 'Đang xử lý...' : 'Hạ cấp FREE'}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
