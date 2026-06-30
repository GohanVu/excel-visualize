import { Test, TestingModule } from '@nestjs/testing';
import { DatasetsSyncService } from '../datasets-sync.service';
import { DatasetsService } from '../datasets.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DatasetsSyncService', () => {
  let service: DatasetsSyncService;
  let mockPrisma: any;
  let mockDatasetsService: any;

  beforeEach(async () => {
    mockPrisma = {
      dataset: {
        findMany: jest.fn(),
      },
    };

    mockDatasetsService = {
      syncGoogleSheet: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatasetsSyncService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DatasetsService, useValue: mockDatasetsService },
      ],
    }).compile();

    service = module.get<DatasetsSyncService>(DatasetsSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleAutoSync', () => {
    it('queries datasets of active pro users and calls syncGoogleSheet', async () => {
      const mockDatasets = [
        { id: 'ds-1', userId: 'user-1', name: 'Sheet 1' },
        { id: 'ds-2', userId: 'user-2', name: 'Sheet 2' },
      ];

      mockPrisma.dataset.findMany.mockResolvedValue(mockDatasets);
      mockDatasetsService.syncGoogleSheet.mockResolvedValue({ id: 'ds-1' });

      await service.handleAutoSync();

      expect(mockPrisma.dataset.findMany).toHaveBeenCalledWith({
        where: {
          googleSpreadsheetId: { not: null },
          user: {
            subscription: {
              plan: 'pro',
              status: 'active',
            },
          },
        },
      });

      expect(mockDatasetsService.syncGoogleSheet).toHaveBeenCalledTimes(2);
      expect(mockDatasetsService.syncGoogleSheet).toHaveBeenNthCalledWith(1, 'user-1', 'ds-1');
      expect(mockDatasetsService.syncGoogleSheet).toHaveBeenNthCalledWith(2, 'user-2', 'ds-2');
    });

    it('continues syncing other datasets even if one sync fails', async () => {
      const mockDatasets = [
        { id: 'ds-fail', userId: 'user-1', name: 'Sheet Fail' },
        { id: 'ds-success', userId: 'user-2', name: 'Sheet Success' },
      ];

      mockPrisma.dataset.findMany.mockResolvedValue(mockDatasets);
      
      // Lần thứ nhất lỗi, lần thứ hai thành công
      mockDatasetsService.syncGoogleSheet
        .mockRejectedValueOnce(new Error('Google API Error'))
        .mockResolvedValueOnce({ id: 'ds-success' });

      await service.handleAutoSync();

      expect(mockDatasetsService.syncGoogleSheet).toHaveBeenCalledTimes(2);
      expect(mockDatasetsService.syncGoogleSheet).toHaveBeenNthCalledWith(1, 'user-1', 'ds-fail');
      expect(mockDatasetsService.syncGoogleSheet).toHaveBeenNthCalledWith(2, 'user-2', 'ds-success');
    });
  });
});
