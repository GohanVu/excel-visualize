import { Test } from '@nestjs/testing';
import { DatasetsController } from '../datasets.controller';
import { DatasetsService } from '../datasets.service';

const mockService = {
  presignUpload: jest.fn(),
  confirmUpload: jest.fn(),
  findAllByUser: jest.fn(),
  parseDataset: jest.fn(),
  getRows: jest.fn(),
  suggestCharts: jest.fn(),
};

const mockUser = { id: 'user-1' } as any;

describe('DatasetsController', () => {
  let controller: DatasetsController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [DatasetsController],
      providers: [{ provide: DatasetsService, useValue: mockService }],
    }).compile();
    controller = module.get(DatasetsController);
    jest.clearAllMocks();
  });

  it('POST /datasets/presign → delegates to service.presignUpload', async () => {
    const dto = {
      filename: 'data.xlsx',
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileSize: 1024,
    };
    mockService.presignUpload.mockResolvedValue({
      presignedUrl: 'https://url',
      objectKey: 'key',
    });
    const result = await controller.presign(mockUser, dto as any);
    expect(mockService.presignUpload).toHaveBeenCalledWith(mockUser, dto);
    expect(result.presignedUrl).toBe('https://url');
  });

  it('POST /datasets → delegates to service.confirmUpload', async () => {
    const dto = {
      objectKey: 'key',
      originalFilename: 'data.xlsx',
      fileSize: 1024,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    mockService.confirmUpload.mockResolvedValue({ id: 'ds-1' });
    const result = await controller.confirm(mockUser, dto as any);
    expect(result.id).toBe('ds-1');
  });

  it('GET /datasets → delegates to service.findAllByUser with userId', async () => {
    mockService.findAllByUser.mockResolvedValue([]);
    await controller.findAll(mockUser);
    expect(mockService.findAllByUser).toHaveBeenCalledWith('user-1');
  });

  it('GET /datasets/:id/columns → delegates to service.parseDataset with userId and id', async () => {
    const expected = { datasetId: 'ds-1', totalRows: 3, columns: [], previewRows: [] };
    mockService.parseDataset.mockResolvedValue(expected);
    const result = await controller.columns(mockUser, 'ds-1');
    expect(mockService.parseDataset).toHaveBeenCalledWith('user-1', 'ds-1');
    expect(result).toEqual(expected);
  });

  it('GET /datasets/:id/rows → delegates to service.getRows with userId and id', async () => {
    const expected = {
      datasetId: 'ds-1',
      rows: [{ Ngày: '2024-01-01', 'Doanh thu': '100' }],
    };
    mockService.getRows.mockResolvedValue(expected);
    const result = await controller.rows(mockUser, 'ds-1');
    expect(mockService.getRows).toHaveBeenCalledWith('user-1', 'ds-1');
    expect(result).toEqual(expected);
  });
});
