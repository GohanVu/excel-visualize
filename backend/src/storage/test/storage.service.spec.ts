import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import { Client } from 'minio';
import { StorageService } from '../storage.service';

const mockMinioClient = {
  bucketExists: jest.fn().mockResolvedValue(true),
  makeBucket: jest.fn(),
  presignedPutObject: jest
    .fn()
    .mockResolvedValue('http://minio:9000/chartly-datasets/key?sig=abc'),
  getObject: jest.fn(),
};

jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => mockMinioClient),
}));

const mockConfig = {
  getOrThrow: jest.fn((key: string) => {
    const map: Record<string, string> = {
      MINIO_ENDPOINT: 'minio',
      MINIO_PORT: '9000',
      MINIO_ACCESS_KEY: 'minioadmin',
      MINIO_SECRET_KEY: 'secret',
    };
    return map[key];
  }),
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      MINIO_USE_SSL: 'false',
      MINIO_BUCKET: 'chartly-datasets',
      MINIO_PUBLIC_ENDPOINT: 'http://localhost:9000',
    };
    return map[key] ?? undefined;
  }),
};

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(StorageService);
    jest.clearAllMocks();
  });

  it('onModuleInit: skips bucket creation when bucket exists', async () => {
    mockMinioClient.bucketExists.mockResolvedValue(true);
    await expect(service.onModuleInit()).resolves.not.toThrow();
    expect(mockMinioClient.makeBucket).not.toHaveBeenCalled();
  });

  it('onModuleInit: creates bucket when it does not exist', async () => {
    mockMinioClient.bucketExists.mockResolvedValue(false);
    await service.onModuleInit();
    expect(mockMinioClient.makeBucket).toHaveBeenCalledWith('chartly-datasets');
  });

  it('presignedPutUrl: returns signed URL as-is (no host string-replace)', async () => {
    mockMinioClient.presignedPutObject.mockResolvedValue(
      'http://localhost:9000/chartly-datasets/user/file.xlsx?sig=abc',
    );
    const url = await service.presignedPutUrl('user/file.xlsx');
    expect(url).toBe(
      'http://localhost:9000/chartly-datasets/user/file.xlsx?sig=abc',
    );
    expect(mockMinioClient.presignedPutObject).toHaveBeenCalledWith(
      'chartly-datasets',
      'user/file.xlsx',
      300,
    );
  });

  it('constructs a presign client using the public host (localhost), not internal host', () => {
    (Client as unknown as jest.Mock).mockClear();
    new StorageService(mockConfig as unknown as ConfigService);
    const endpoints = (Client as unknown as jest.Mock).mock.calls.map(
      (c) => c[0].endPoint,
    );
    expect(endpoints).toContain('minio'); // internal client
    expect(endpoints).toContain('localhost'); // presign client
  });

  it('getObject: collects stream chunks into a Buffer', async () => {
    const fakeStream = new EventEmitter() as EventEmitter & NodeJS.ReadableStream;
    mockMinioClient.getObject.mockResolvedValue(fakeStream);

    const resultPromise = service.getObject('user/file.xlsx');

    // Đợi getObject resume sau `await client.getObject` để listener kịp attach
    await new Promise((r) => setImmediate(r));
    fakeStream.emit('data', Buffer.from('hello '));
    fakeStream.emit('data', Buffer.from('world'));
    fakeStream.emit('end');

    const buf = await resultPromise;
    expect(buf.toString()).toBe('hello world');
  });
});
