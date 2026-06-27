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
  createdAt: string;
}

export async function listCharts(): Promise<DashboardChart[]> {
  const { data } = await client.get<{ charts: DashboardChart[] }>('/charts');
  return data.charts;
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
