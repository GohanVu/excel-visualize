import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import client from '../api/client';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  async function handleLogout() {
    try {
      await client.post('/auth/logout');
    } finally {
      window.location.href = '/login';
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <h1 className="text-lg font-bold">ChartLy</h1>
        <div className="flex items-center gap-4">
          {user?.name && (
            <span className="text-sm text-gray-400">{user.name}</span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-gray-400 transition hover:text-white"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h2 className="text-2xl font-bold">Chào mừng đến ChartLy 👋</h2>
        <p className="mt-2 text-gray-400">
          Upload file Excel hoặc CSV để biến dữ liệu thành biểu đồ chỉ trong vài
          bước.
        </p>
        <button
          type="button"
          onClick={() => navigate('/upload')}
          className="mt-8 rounded-lg bg-blue-600 px-8 py-3 font-medium transition hover:bg-blue-500"
        >
          Upload dữ liệu
        </button>
      </main>
    </div>
  );
}
