import client from './client';

export interface SavedChart {
  chart: { id: string; dashboardId: string; type: string; title: string | null };
  dashboardId: string;
}

export interface DashboardChart {
  id: string;
  type: string;
  title: string | null;
  config: Record<string, unknown>;
  position: ChartPosition;
  createdAt: string;
}

// Vị trí/kích thước chart trên lưới dashboard (react-grid-layout). {} khi chưa đặt.
export interface ChartPosition {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export interface LayoutItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export async function listCharts(): Promise<DashboardChart[]> {
  const { data } = await client.get<{ charts: DashboardChart[] }>('/charts');
  return data.charts;
}

// Lưu vị trí các chart sau khi user kéo-thả/resize.
export async function updateLayout(layout: LayoutItem[]): Promise<void> {
  await client.patch('/charts/layout', { layout });
}

// Xoá 1 chart khỏi dashboard.
export async function deleteChart(chartId: string): Promise<void> {
  await client.delete(`/charts/${chartId}`);
}

export async function saveChart(
  datasetId: string,
  type: string,
  title: string,
  config: Record<string, unknown>,
): Promise<SavedChart> {
  const { data } = await client.post<SavedChart>('/charts', {
    datasetId,
    type,
    title,
    config,
  });
  return data;
}
