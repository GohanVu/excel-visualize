import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';

interface Stats {
  totalUsers: number;
  totalCharts: number;
  totalDatasets: number;
  proUsers: number;
}

export default function AdminStatsPage() {
  const { data: stats, isLoading, isError } = useQuery<Stats>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data } = await client.get<Stats>('/admin/stats');
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="text-center text-red-400 p-8 border border-red-500/20 bg-red-500/5 rounded-xl">
        Không thể tải thông tin thống kê. Vui lòng thử lại sau.
      </div>
    );
  }

  const kpis = [
    {
      label: 'Tổng người dùng',
      value: stats.totalUsers.toLocaleString(),
      change: 'Hệ thống',
      color: 'from-blue-600 to-indigo-600',
      icon: '👥',
    },
    {
      label: 'Tài khoản PRO',
      value: stats.proUsers.toLocaleString(),
      change: `${((stats.proUsers / (stats.totalUsers || 1)) * 100).toFixed(1)}% tổng số`,
      color: 'from-amber-500 to-orange-600',
      icon: '⭐',
    },
    {
      label: 'Tổng biểu đồ đã vẽ',
      value: stats.totalCharts.toLocaleString(),
      change: `${(stats.totalCharts / (stats.totalUsers || 1)).toFixed(1)} / người dùng`,
      color: 'from-emerald-500 to-teal-600',
      icon: '📊',
    },
    {
      label: 'Tổng số File (Sheet)',
      value: stats.totalDatasets.toLocaleString(),
      change: `${(stats.totalDatasets / (stats.totalUsers || 1)).toFixed(1)} / người dùng`,
      color: 'from-pink-500 to-rose-600',
      icon: '📂',
    },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl transition-transform hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/5 blur-xl" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">{kpi.label}</span>
              <span className="text-2xl">{kpi.icon}</span>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold tracking-tight text-white">{kpi.value}</span>
            </div>
            <div className="mt-2 flex items-center text-xs text-gray-500">
              <span className="font-medium text-gray-400">{kpi.change}</span>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r ${kpi.color}`} />
          </div>
        ))}
      </div>

      {/* Additional Stats Details / Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-6">Tỷ lệ chuyển đổi Premium</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Tài khoản Free ({stats.totalUsers - stats.proUsers})</span>
              <span className="font-semibold text-white">
                {(((stats.totalUsers - stats.proUsers) / (stats.totalUsers || 1)) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full"
                style={{ width: `${(((stats.totalUsers - stats.proUsers) / (stats.totalUsers || 1)) * 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-sm pt-2">
              <span className="text-gray-400">Tài khoản PRO ({stats.proUsers})</span>
              <span className="font-semibold text-amber-400">
                {((stats.proUsers / (stats.totalUsers || 1)) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-600 h-full rounded-full"
                style={{ width: `${((stats.proUsers / (stats.totalUsers || 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Thông tin hệ thống</h3>
            <p className="text-sm text-gray-400">Trạng thái hoạt động của các dịch vụ liên kết.</p>
          </div>
          <div className="mt-6 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-sm text-gray-400">Database (PostgreSQL)</span>
              <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Online</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-sm text-gray-400">Object Storage (MinIO)</span>
              <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Online</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-400">Caching & Queue (Redis)</span>
              <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
