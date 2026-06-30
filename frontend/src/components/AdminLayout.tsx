import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/admin/stats', label: '📊 Thống kê' },
    { path: '/admin/users', label: '👥 Người dùng' },
    { path: '/admin/audit-logs', label: '📜 Nhật ký' },
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 bg-gray-900 flex flex-col justify-between">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-gray-800 flex items-center space-x-2">
            <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
              ChartLy Admin
            </span>
          </div>

          {/* Menu */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white font-medium shadow-lg shadow-blue-600/20'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
            )}
            <div className="truncate">
              <p className="text-sm font-medium truncate">{user?.name || 'Admin'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs text-gray-400 hover:text-gray-100 border border-gray-700 px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors shrink-0"
            title="Quay lại ứng dụng chính"
          >
            App ↩
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-gray-800 bg-gray-900 flex items-center justify-between px-8">
          <h1 className="text-lg font-semibold">
            {location.pathname === '/admin/stats' && 'Thống kê hệ thống'}
            {location.pathname === '/admin/users' && 'Quản lý người dùng'}
            {location.pathname === '/admin/audit-logs' && 'Nhật ký hoạt động'}
          </h1>
          <div className="flex items-center space-x-4">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
              Administrator
            </span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
