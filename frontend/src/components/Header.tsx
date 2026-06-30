import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import client from '../api/client';

interface HeaderProps {
  showBack?: boolean;
  backUrl?: string;
  backText?: string;
}

export default function Header({ showBack, backUrl = '/dashboard', backText = 'Quay lại Dashboard' }: HeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await client.post('/auth/logout');
    } finally {
      window.location.href = '/login';
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-6 py-4">
      <div className="flex items-center gap-6">
        <Link to="/dashboard" className="text-lg font-bold text-white hover:text-purple-400 transition">
          ChartLy
        </Link>
        {showBack && (
          <Link
            to={backUrl}
            className="hidden sm:inline-flex items-center text-sm text-gray-400 hover:text-white transition gap-1"
          >
            <span>←</span> {backText}
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        {showBack && (
          <Link
            to={backUrl}
            className="inline-flex sm:hidden items-center text-sm text-gray-400 hover:text-white transition gap-1"
          >
            <span>←</span> Quay lại
          </Link>
        )}
        {user?.name && (
          <Link
            to="/profile"
            className="text-sm text-gray-400 hover:text-white transition font-medium"
            aria-label="Trang cá nhân"
          >
            👤 {user.name}
          </Link>
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
  );
}
