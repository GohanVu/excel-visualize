import client from './client';

export interface Dataset {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  minioKey: string;
  rowCount: number | null;
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
