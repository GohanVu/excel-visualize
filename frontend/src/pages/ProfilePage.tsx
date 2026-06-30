import { useAuth } from '../hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await client.post('/auth/logout');
    },
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], null);
      navigate('/login', { replace: true });
    },
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Header showBack />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-2xl relative overflow-hidden">
          {/* Glow decoration */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 h-40 w-40 rounded-full bg-blue-600/10 blur-3xl" />

        {/* Profile Content */}
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="relative">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Avatar"
                className="h-24 w-24 rounded-full object-cover ring-4 ring-gray-800"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-3xl ring-4 ring-gray-800">
                {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
              </div>
            )}
            {user.role === 'admin' && (
              <span className="absolute bottom-0 right-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white uppercase border border-gray-900">
                Admin
              </span>
            )}
          </div>

          {/* Name & Email */}
          <h2 className="mt-4 text-xl font-bold text-white">{user.name || 'Người dùng'}</h2>
          <p className="text-sm text-gray-400 mt-1">{user.email}</p>

          {/* Details Card */}
          <div className="w-full mt-8 rounded-xl border border-gray-800 bg-gray-950/50 p-4 space-y-3 text-left">
            <div className="flex justify-between items-center text-sm py-1.5 border-b border-gray-800">
              <span className="text-gray-400">Gói tài khoản</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {user.subscription?.plan === 'pro' ? '⭐ PRO' : 'FREE'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm py-1.5">
              <span className="text-gray-400">Ngày tham gia</span>
              <span className="text-gray-300 font-medium">
                {new Date(user.createdAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full mt-8 space-y-3">
            {user.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="w-full py-2.5 rounded-xl text-sm font-medium bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-white transition-colors"
              >
                ⚙️ Vào trang quản trị
              </button>
            )}

            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/30 text-red-400 transition-colors disabled:opacity-50"
            >
              {logoutMutation.isPending ? 'Đang đăng xuất...' : 'Đăng xuất'}
            </button>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}
