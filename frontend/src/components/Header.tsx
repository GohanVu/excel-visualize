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

  const now = new Date();
  const showExpiryWarning = !!(
    user?.subscription?.plan === 'pro' &&
    user?.subscription?.expiredAt &&
    (() => {
      const expiry = new Date(user.subscription.expiredAt);
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 3;
    })()
  );

  const remainingDays = user?.subscription?.expiredAt
    ? Math.max(1, Math.ceil((new Date(user.subscription.expiredAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="w-full flex flex-col">
      {showExpiryWarning && (
        <div className="bg-amber-600 text-white text-center py-2 px-4 text-xs font-semibold flex items-center justify-center gap-2">
          <span>⚠️ Gói Pro của bạn sẽ hết hạn trong vòng {remainingDays} ngày nữa.</span>
          <Link to="/pricing" className="underline hover:text-gray-200 ml-1">Gia hạn ngay</Link>
        </div>
      )}
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
    </div>
  );
}
