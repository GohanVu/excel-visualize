import client from './client';

export interface Dashboard {
  id: string;
  name: string;
}

// Dashboard mặc định của user (null nếu chưa tạo — chưa lưu chart nào).
export async function getDefaultDashboard(): Promise<Dashboard | null> {
  const { data } = await client.get<{ dashboard: Dashboard | null }>(
    '/dashboards/default',
  );
  return data.dashboard;
}

// Đổi tên dashboard.
export async function renameDashboard(
  id: string,
  name: string,
): Promise<Dashboard> {
  const { data } = await client.patch<Dashboard>(`/dashboards/${id}`, { name });
  return data;
}
