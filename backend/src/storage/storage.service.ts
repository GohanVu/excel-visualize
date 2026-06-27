import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly client: Minio.Client;
  private readonly presignClient: Minio.Client;
  private readonly bucket: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private config: ConfigService) {
    const endpoint = config.getOrThrow<string>('MINIO_ENDPOINT');
    const port = parseInt(config.getOrThrow<string>('MINIO_PORT'), 10);
    const useSSL = config.get('MINIO_USE_SSL') === 'true';
    const accessKey = config.getOrThrow<string>('MINIO_ACCESS_KEY');
    const secretKey = config.getOrThrow<string>('MINIO_SECRET_KEY');

    this.bucket = config.get('MINIO_BUCKET') ?? 'chartly-datasets';

    // Client nội bộ: backend ↔ MinIO trong Docker network (host "minio")
    this.client = new Minio.Client({ endPoint: endpoint, port, useSSL, accessKey, secretKey });

    // Client để KÝ presigned URL theo host mà BROWSER thực sự gọi (vd localhost:9000).
    // AWS Sig v4 ký cả host header → không thể string-replace host sau khi ký (gây 403).
    // region cố định để presign không cần gọi GetBucketLocation.
    const pub = new URL(
      config.get('MINIO_PUBLIC_ENDPOINT') ?? 'http://localhost:9000',
    );
    this.presignClient = new Minio.Client({
      endPoint: pub.hostname,
      port: pub.port
        ? parseInt(pub.port, 10)
        : pub.protocol === 'https:'
          ? 443
          : 80,
      useSSL: pub.protocol === 'https:',
      accessKey,
      secretKey,
      region: 'us-east-1',
    });
  }

  async onModuleInit() {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Bucket "${this.bucket}" created`);
    }
  }

  async presignedPutUrl(objectKey: string, expirySecs = 300): Promise<string> {
    // Ký bằng presignClient (host công khai) → URL dùng được trực tiếp từ browser
    return this.presignClient.presignedPutObject(
      this.bucket,
      objectKey,
      expirySecs,
    );
  }

  async getObject(objectKey: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, objectKey);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
