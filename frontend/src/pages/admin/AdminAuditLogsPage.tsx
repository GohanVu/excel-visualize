import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import { useState } from 'react';

interface AuditLogItem {
  id: string;
  userId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  metadata: any;
  ipAddress: string | null;
  createdAt: string;
  user: {
    email: string;
    name: string | null;
  } | null;
}

interface AuditLogsResponse {
  logs: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: res, isLoading, isError } = useQuery<AuditLogsResponse>({
    queryKey: ['admin', 'audit-logs', page],
    queryFn: async () => {
      const { data } = await client.get<AuditLogsResponse>(`/admin/audit-logs?page=${page}&limit=${limit}`);
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

  if (isError || !res) {
    return (
      <div className="text-center text-red-400 p-8 border border-red-500/20 bg-red-500/5 rounded-xl">
        Không thể tải nhật ký hoạt động. Vui lòng thử lại sau.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-6">Thời gian</th>
                <th className="py-4 px-6">Người thực hiện</th>
                <th className="py-4 px-6">Hành động</th>
                <th className="py-4 px-6">Đối tượng</th>
                <th className="py-4 px-6">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-sm text-gray-300">
              {res.logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    Chưa có hoạt động nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                res.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-850/30 transition-colors">
                    {/* Time */}
                    <td className="py-4 px-6 text-gray-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('vi-VN')}
                    </td>

                    {/* User */}
                    <td className="py-4 px-6">
                      {log.user ? (
                        <div>
                          <div className="font-medium text-white">{log.user.name || 'Người dùng'}</div>
                          <div className="text-xs text-gray-500">{log.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Hệ thống / Ẩn danh</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-6">
                      <span className="font-mono text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-blue-400">
                        {log.action}
                      </span>
                    </td>

                    {/* Entity */}
                    <td className="py-4 px-6">
                      {log.entity ? (
                        <div>
                          <span className="text-gray-300">{log.entity}</span>
                          {log.entityId && (
                            <span className="text-xs text-gray-500 block font-mono">{log.entityId}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>

                    {/* Details (Metadata) */}
                    <td className="py-4 px-6">
                      {log.metadata ? (
                        <pre className="text-xs text-gray-400 font-mono max-w-xs overflow-x-auto bg-gray-950 p-2 rounded border border-gray-800">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {res.totalPages > 1 && (
        <div className="flex justify-between items-center px-2">
          <span className="text-xs text-gray-500">
            Hiển thị trang {page} / {res.totalPages} (Tổng số {res.total} bản ghi)
          </span>
          <div className="flex space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-900 text-sm text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-gray-900 disabled:hover:text-gray-400 transition-colors"
            >
              Trước
            </button>
            <button
              disabled={page >= res.totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, res.totalPages))}
              className="px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-900 text-sm text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-gray-900 disabled:hover:text-gray-400 transition-colors"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
