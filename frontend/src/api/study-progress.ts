import client from './client';

// Khớp enum StudyStatus ở backend (prisma). 'known' = đã thuộc.
export type StudyStatus = 'new' | 'learning' | 'known';

export interface ProgressItem {
  cardKey: string;
  status: StudyStatus;
  seenCount: number;
  lastReviewedAt: string | null;
}

export interface SaveProgressInput {
  datasetId: string;
  sheet?: string;
  cardKey: string;
  status: StudyStatus;
}

// Đọc tiến độ học của 1 dataset theo tab. sheet không truyền → tab mặc định ("").
export async function fetchProgress(
  datasetId: string,
  sheet?: string,
): Promise<{ items: ProgressItem[] }> {
  const params: Record<string, string> = {};
  if (sheet != null) params.sheet = sheet;
  const { data } = await client.get<{ items: ProgressItem[] }>(
    `/study-progress/${datasetId}`,
    { params },
  );
  return data;
}

// Lưu (upsert) tiến độ 1 thẻ.
export async function saveProgress(input: SaveProgressInput): Promise<void> {
  await client.post('/study-progress', input);
}
