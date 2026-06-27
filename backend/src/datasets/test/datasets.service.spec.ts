import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DatasetsService } from '../datasets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { ParserService } from '../../parser/parser.service';
import { ColumnTypeService } from '../../parser/column-type.service';
import { ChartSuggesterService } from '../../suggester/chart-suggester.service';
import { ColumnType } from '@prisma/client';

const mockPrisma = {
  subscription: { findUnique: jest.fn() },
  dataset: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
};

const mockStorage = {
  presignedPutUrl: jest.fn().mockResolvedValue('https://minio/presigned'),
  getObject: jest.fn(),
};

const mockParser = {
  parse: jest.fn(),
};

const mockUser = { id: 'user-1', email: 'u@test.com' } as any;

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

describe('DatasetsService', () => {
  let service: DatasetsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DatasetsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
        { provide: ParserService, useValue: mockParser },
        ColumnTypeService,
        ChartSuggesterService,
      ],
    }).compile();
    service = module.get(DatasetsService);
    jest.clearAllMocks();
    mockStorage.presignedPutUrl.mockResolvedValue('https://minio/presigned');
    mockStorage.getObject.mockResolvedValue(Buffer.from('fake'));
    mockParser.parse.mockReturnValue({
      headers: ['Ngày', 'Doanh thu'],
      rows: [
        ['2024-01-01', '100'],
        ['2024-01-02', '200'],
        ['2024-01-03', '300'],
      ],
    });
  });

  describe('presignUpload', () => {
    it('rejects free user file exceeding 10MB', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      await expect(
        service.presignUpload(mockUser, {
          filename: 'big.xlsx',
          contentType: XLSX_MIME,
          fileSize: 11 * 1024 * 1024,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows pro user file up to 50MB', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        plan: 'pro',
        status: 'active',
      });
      const result = await service.presignUpload(mockUser, {
        filename: 'big.xlsx',
        contentType: XLSX_MIME,
        fileSize: 30 * 1024 * 1024,
      });
      expect(result.presignedUrl).toBe('https://minio/presigned');
    });

    it('rejects invalid file extension', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      await expect(
        service.presignUpload(mockUser, {
          filename: 'doc.txt',
          contentType: 'text/plain',
          fileSize: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns presignedUrl and objectKey containing the extension', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      const result = await service.presignUpload(mockUser, {
        filename: 'report.csv',
        contentType: 'text/csv',
        fileSize: 1024,
      });
      expect(result.objectKey).toContain('.csv');
      expect(result.presignedUrl).toBeDefined();
    });
  });

  describe('confirmUpload', () => {
    it('creates a dataset record for the user', async () => {
      const dto = {
        objectKey: 'user-1/123.xlsx',
        originalFilename: 'report.xlsx',
        fileSize: 1024,
        mimeType: XLSX_MIME,
      };
      mockPrisma.dataset.create.mockResolvedValue({ id: 'ds-1', ...dto });
      const result = await service.confirmUpload(mockUser, dto);
      expect(result.id).toBe('ds-1');
      expect(mockPrisma.dataset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1', name: 'report' }),
        }),
      );
    });
  });

  describe('findAllByUser', () => {
    it('returns datasets for the given userId', async () => {
      mockPrisma.dataset.findMany.mockResolvedValue([{ id: 'ds-1' }]);
      const result = await service.findAllByUser('user-1');
      expect(result).toHaveLength(1);
      expect(mockPrisma.dataset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });

  describe('parseDataset', () => {
    const mockDataset = {
      id: 'ds-1',
      userId: 'user-1',
      name: 'report',
      minioKey: 'user-1/file.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    it('throws NotFoundException when dataset does not belong to user', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue(null);
      await expect(service.parseDataset('user-1', 'ds-99')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns columns with sampleValues and totalRows', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue(mockDataset);
      const result = await service.parseDataset('user-1', 'ds-1');

      expect(result.datasetId).toBe('ds-1');
      expect(result.totalRows).toBe(3);
      expect(result.columns).toHaveLength(2);
      expect(result.columns[0]).toEqual({
        name: 'Ngày',
        index: 0,
        type: ColumnType.date,
        sampleValues: ['2024-01-01', '2024-01-02', '2024-01-03'],
      });
      expect(result.columns[1].type).toBe(ColumnType.number);
    });

    it('calls storage.getObject with dataset minioKey', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue(mockDataset);
      await service.parseDataset('user-1', 'ds-1');
      expect(mockStorage.getObject).toHaveBeenCalledWith('user-1/file.xlsx');
    });

    it('previewRows contains at most 10 rows as key-value objects', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue(mockDataset);
      const result = await service.parseDataset('user-1', 'ds-1');
      expect(result.previewRows.length).toBeLessThanOrEqual(10);
      expect(result.previewRows[0]).toEqual({
        Ngày: '2024-01-01',
        'Doanh thu': '100',
      });
    });
  });

  describe('getRows', () => {
    const mockDataset = {
      id: 'ds-1',
      userId: 'user-1',
      name: 'report',
      minioKey: 'user-1/file.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    it('throws NotFoundException when dataset does not belong to user', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue(null);
      await expect(service.getRows('user-1', 'ds-99')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns all rows as key-value objects', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue(mockDataset);
      const result = await service.getRows('user-1', 'ds-1');
      expect(result.datasetId).toBe('ds-1');
      expect(result.rows).toHaveLength(3);
      expect(result.rows[0]).toEqual({ Ngày: '2024-01-01', 'Doanh thu': '100' });
      expect(result.rows[2]).toEqual({ Ngày: '2024-01-03', 'Doanh thu': '300' });
    });
  });

  describe('suggestCharts', () => {
    const mockDataset = {
      id: 'ds-1',
      userId: 'user-1',
      name: 'report',
      minioKey: 'user-1/file.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    it('returns suggestions for selected date + number columns', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue(mockDataset);
      const result = await service.suggestCharts('user-1', 'ds-1', [0, 1]);
      expect(result.datasetId).toBe('ds-1');
      expect(result.suggestions.map((s) => s.type)).toEqual(['line', 'bar']);
    });

    it('throws BadRequestException when selected indexes are invalid', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue(mockDataset);
      await expect(
        service.suggestCharts('user-1', 'ds-1', [99]),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
