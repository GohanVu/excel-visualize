import client from './client';

export interface Dataset {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  minioKey: string;
  rowCount: number | null;
  googleSpreadsheetId?: string | null;
  lastSyncedAt?: string | null;
  createdAt: string;
}

interface PresignResponse {
  presignedUrl: string;
  objectKey: string;
}

async function presignUpload(
  filename: string,
  contentType: string,
  fileSize: number,
): Promise<PresignResponse> {
  const { data } = await client.post<PresignResponse>('/datasets/presign', {
    filename,
    contentType,
    fileSize,
  });
  return data;
}

async function confirmUpload(
  objectKey: string,
  originalFilename: string,
  fileSize: number,
  mimeType: string,
): Promise<Dataset> {
  const { data } = await client.post<Dataset>('/datasets', {
    objectKey,
    originalFilename,
    fileSize,
    mimeType,
  });
  return data;
}

export async function uploadFile(file: File): Promise<Dataset> {
  const { presignedUrl, objectKey } = await presignUpload(
    file.name,
    file.type,
    file.size,
  );

  await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  return confirmUpload(objectKey, file.name, file.size, file.type);
}

export async function fetchDatasets(): Promise<Dataset[]> {
  const { data } = await client.get<Dataset[]>('/datasets');
  return data;
}

export async function deleteDataset(datasetId: string): Promise<void> {
  await client.delete(`/datasets/${datasetId}`);
}

export type ColumnType = 'date' | 'number' | 'string' | 'category';

export interface DatasetColumn {
  name: string;
  index: number;
  type: ColumnType;
  confidence: number;
  sampleValues: string[];
}

export interface DatasetOverview {
  datasetId: string;
  name: string;
  totalRows: number;
  sheets: string[];
  activeSheet: string;
  headerRowIndex: number;
  headerConfident: boolean;
  learnable: boolean;
  columns: DatasetColumn[];
  previewRows: Record<string, string>[];
}

export async function fetchColumns(
  datasetId: string,
  opts: { sheet?: string; headerRow?: number } = {},
): Promise<DatasetOverview> {
  const params: Record<string, string> = {};
  if (opts.sheet != null) params.sheet = opts.sheet;
  if (opts.headerRow != null) params.headerRow = String(opts.headerRow);
  const { data } = await client.get<DatasetOverview>(
    `/datasets/${datasetId}/columns`,
    { params },
  );
  return data;
}

export type ChartType = 'line' | 'bar' | 'pie' | 'scatter';

// Phép gộp khi nhóm theo cột x. 'count' = đếm dòng (không cần cột số);
// còn lại áp lên 1 cột số (y[0]). 'percent' KHÔNG ở đây — đó là cách hiển thị.
export type Aggregation =
  | 'count'
  | 'sum'
  | 'average'
  | 'median'
  | 'min'
  | 'max';

export interface ChartSuggestion {
  type: ChartType;
  title: string;
  description: string;
  encoding: { x: string; y: string[] };
  aggregation?: Aggregation;
}

export interface SuggestResponse {
  datasetId: string;
  suggestions: ChartSuggestion[];
}

export interface DatasetRows {
  datasetId: string;
  rows: Record<string, string>[];
}

export async function fetchRows(
  datasetId: string,
  opts: { sheet?: string; headerRow?: number } = {},
): Promise<DatasetRows> {
  const params: Record<string, string> = {};
  if (opts.sheet != null) params.sheet = opts.sheet;
  if (opts.headerRow != null) params.headerRow = String(opts.headerRow);
  const { data } = await client.get<DatasetRows>(
    `/datasets/${datasetId}/rows`,
    { params },
  );
  return data;
}

export interface TypeOverride {
  index: number;
  type: ColumnType;
}

export async function suggestCharts(
  datasetId: string,
  columns: number[],
  opts: {
    sheet?: string;
    headerRow?: number;
    typeOverrides?: TypeOverride[];
  } = {},
): Promise<SuggestResponse> {
  const { data } = await client.post<SuggestResponse>(
    `/datasets/${datasetId}/suggest`,
    {
      columns,
      sheet: opts.sheet,
      headerRow: opts.headerRow,
      typeOverrides: opts.typeOverrides,
    },
  );
  return data;
}

export async function importGoogleSheet(url: string): Promise<Dataset> {
  const { data } = await client.post<Dataset>('/datasets/google-sheet', { url });
  return data;
}

export async function syncDataset(datasetId: string): Promise<Dataset> {
  const { data } = await client.post<Dataset>(`/datasets/${datasetId}/sync`);
  return data;
}
