import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DatasetsService } from '../datasets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { ParserService } from '../../parser/parser.service';
import { ColumnTypeService } from '../../parser/column-type.service';
import { ChartSuggesterService } from '../../suggester/chart-suggester.service';
import { ColumnType } from '@prisma/client';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';

const mockPrisma = {
  subscription: { findUnique: jest.fn() },
  dataset: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  chart: { deleteMany: jest.fn() },
  $transaction: jest.fn().mockResolvedValue(undefined),
};

const mockStorage = {
  presignedPutUrl: jest.fn().mockResolvedValue('https://minio/presigned'),
  getObject: jest.fn(),
  removeObject: jest.fn().mockResolvedValue(undefined),
};

const mockParser = {
  parse: jest.fn(),
};

const mockUser = { id: 'user-1', email: 'u@test.com' } as any;

const mockAuditLogs = {
  log: jest.fn(),
};

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
        { provide: AuditLogsService, useValue: mockAuditLogs },
      ],
    }).compile();
    service = module.get(DatasetsService);
    jest.clearAllMocks();
    mockPrisma.dataset.count.mockResolvedValue(0);
    mockStorage.presignedPutUrl.mockResolvedValue('https://minio/presigned');
    mockStorage.getObject.mockResolvedValue(Buffer.from('fake'));
    mockParser.parse.mockReturnValue({
      headers: ['Ngày', 'Doanh thu'],
      rows: [
        ['2024-01-01', '100'],
        ['2024-01-02', '200'],
        ['2024-01-03', '300'],
      ],
      headerRowIndex: 0,
      headerConfident: true,
      sheets: ['Sheet1'],
      sheetName: 'Sheet1',
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

    it('rejects when free user reached the 2-sheet quota', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.dataset.count.mockResolvedValue(2);
      await expect(
        service.presignUpload(mockUser, {
          filename: 'new.xlsx',
          contentType: XLSX_MIME,
          fileSize: 1024,
        }),
      ).rejects.toThrow(/giới hạn 2 sheet/i);
    });

    it('allows pro user beyond the free quota (under 20)', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        plan: 'pro',
        status: 'active',
      });
      mockPrisma.dataset.count.mockResolvedValue(5);
      const result = await service.presignUpload(mockUser, {
        filename: 'new.xlsx',
        contentType: XLSX_MIME,
        fileSize: 1024,
      });
      expect(result.presignedUrl).toBeDefined();
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

  describe('deleteDataset', () => {
    it('throws NotFoundException when dataset does not belong to user', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue(null);
      await expect(service.deleteDataset('user-1', 'ds-x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes charts + dataset and removes the MinIO object', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue({
        id: 'ds-1',
        userId: 'user-1',
        minioKey: 'user-1/file.xlsx',
      });
      const result = await service.deleteDataset('user-1', 'ds-1');

      expect(mockPrisma.chart.deleteMany).toHaveBeenCalledWith({
        where: { datasetId: 'ds-1' },
      });
      expect(mockPrisma.dataset.delete).toHaveBeenCalledWith({
        where: { id: 'ds-1' },
      });
      expect(mockStorage.removeObject).toHaveBeenCalledWith('user-1/file.xlsx');
      expect(result).toEqual({ id: 'ds-1', deleted: true });
    });

    it('still succeeds if MinIO removal fails (best-effort)', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue({
        id: 'ds-1',
        userId: 'user-1',
        minioKey: 'k',
      });
      mockStorage.removeObject.mockRejectedValueOnce(new Error('minio down'));
      await expect(service.deleteDataset('user-1', 'ds-1')).resolves.toEqual({
        id: 'ds-1',
        deleted: true,
      });
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
      expect(result.headerRowIndex).toBe(0);
      expect(result.headerConfident).toBe(true);
      expect(result.columns).toHaveLength(2);
      expect(result.columns[0]).toEqual({
        name: 'Ngày',
        index: 0,
        type: ColumnType.date,
        confidence: 1,
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

    it('drops fully-empty columns (e.g. image columns) but keeps original index', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue(mockDataset);
      mockParser.parse.mockReturnValue({
        headers: ['STT', 'Ảnh', 'Tên'],
        rows: [
          ['1', '', 'Alice'],
          ['2', '', 'Bob'],
        ],
        headerRowIndex: 0,
        headerConfident: true,
        sheets: ['Sheet1'],
        sheetName: 'Sheet1',
      });
      const result = await service.parseDataset('user-1', 'ds-1');
      expect(result.columns.map((c) => c.name)).toEqual(['STT', 'Tên']);
      // index gốc giữ nguyên để /suggest map đúng cột
      expect(result.columns.find((c) => c.name === 'Tên')?.index).toBe(2);
      // preview không còn cột rỗng
      expect(result.previewRows[0]).toEqual({ STT: '1', Tên: 'Alice' });
    });

    it('flags learnable data (>= 2 text columns)', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue(mockDataset);
      mockParser.parse.mockReturnValue({
        headers: ['Chữ Hán', 'Nghĩa'],
        rows: [
          ['八', 'tám'],
          ['好', 'tốt'],
        ],
        headerRowIndex: 0,
        headerConfident: true,
        sheets: ['Sheet1'],
        sheetName: 'Sheet1',
      });
      const result = await service.parseDataset('user-1', 'ds-1');
      expect(result.learnable).toBe(true);
    });

    it('does not flag numeric data as learnable', async () => {
      // mock mặc định: Ngày(date) + Doanh thu(number) → 0 cột chữ
      mockPrisma.dataset.findFirst.mockResolvedValue(mockDataset);
      const result = await service.parseDataset('user-1', 'ds-1');
      expect(result.learnable).toBe(false);
    });

    it('gives a fallback name to a column with empty header but data', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue(mockDataset);
      mockParser.parse.mockReturnValue({
        headers: ['STT', ''],
        rows: [
          ['1', 'Nhóm 5'],
          ['2', 'Nhóm 5'],
        ],
        headerRowIndex: 0,
        headerConfident: true,
        sheets: ['Sheet1'],
        sheetName: 'Sheet1',
      });
      const result = await service.parseDataset('user-1', 'ds-1');
      expect(result.columns.map((c) => c.name)).toEqual(['STT', 'Cột 2']);
    });

    it('returns the sheet list + active sheet and passes sheetName to parser', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue(mockDataset);
      mockParser.parse.mockReturnValue({
        headers: ['A', 'B'],
        rows: [['1', '2']],
        headerRowIndex: 0,
        headerConfident: true,
        sheets: ['Tab1', 'Tab2'],
        sheetName: 'Tab2',
      });
      const result = await service.parseDataset('user-1', 'ds-1', 'Tab2');
      expect(result.sheets).toEqual(['Tab1', 'Tab2']);
      expect(result.activeSheet).toBe('Tab2');
      expect(mockParser.parse).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.any(String),
        { sheetName: 'Tab2' },
      );
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

    // Regression Issue-008: /rows phải dùng cùng sheet+headerRow như /columns,
    // nếu không key cột lệch → giá trị rỗng (flashcard/chart trống)
    it('passes sheetName + headerRow to the parser', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue(mockDataset);
      await service.getRows('user-1', 'ds-1', 'Tab2', 4);
      expect(mockParser.parse).toHaveBeenCalledWith(expect.any(Buffer), expect.any(String), {
        sheetName: 'Tab2',
        headerRow: 4,
      });
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

    it('applies type overrides before suggesting', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue(mockDataset);
      // Mặc định Ngày(date)+Doanh thu(number) → line,bar
      // Override Ngày → category ⇒ category+number → bar,pie
      const result = await service.suggestCharts('user-1', 'ds-1', [0, 1], {
        typeOverrides: [{ index: 0, type: ColumnType.category }],
      });
      expect(result.suggestions.map((s) => s.type)).toEqual(['bar', 'pie']);
    });

    it('passes sheetName + headerRow to parseDataset', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue(mockDataset);
      const spy = jest.spyOn(service, 'parseDataset');
      await service.suggestCharts('user-1', 'ds-1', [0, 1], {
        sheetName: 'Tab2',
        headerRow: 1,
      });
      expect(spy).toHaveBeenCalledWith('user-1', 'ds-1', 'Tab2', 1);
      spy.mockRestore();
    });
  });
});
