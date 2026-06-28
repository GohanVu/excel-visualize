import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StudyProgressService } from '../study-progress.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  dataset: { findFirst: jest.fn() },
  studyProgress: { upsert: jest.fn(), findMany: jest.fn() },
};

describe('StudyProgressService', () => {
  let service: StudyProgressService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StudyProgressService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(StudyProgressService);
    jest.clearAllMocks();
  });

  describe('saveProgress', () => {
    const dto = { datasetId: 'ds-1', cardKey: 'k-1', status: 'known' as const };

    it('throws NotFoundException when dataset does not belong to user', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue(null);
      await expect(service.saveProgress('user-1', dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.studyProgress.upsert).not.toHaveBeenCalled();
    });

    it('upserts by the compound unique key with sheet defaulting to ""', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue({ id: 'ds-1' });
      mockPrisma.studyProgress.upsert.mockResolvedValue({ id: 'sp-1' });

      await service.saveProgress('user-1', dto);

      expect(mockPrisma.studyProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_datasetId_sheet_cardKey: {
              userId: 'user-1',
              datasetId: 'ds-1',
              sheet: '',
              cardKey: 'k-1',
            },
          },
          create: expect.objectContaining({
            status: 'known',
            seenCount: 1,
          }),
          update: expect.objectContaining({
            status: 'known',
            seenCount: { increment: 1 },
          }),
        }),
      );
    });

    it('passes through an explicit sheet name', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue({ id: 'ds-1' });
      mockPrisma.studyProgress.upsert.mockResolvedValue({ id: 'sp-1' });

      await service.saveProgress('user-1', { ...dto, sheet: '214 bộ thủ' });

      const arg = mockPrisma.studyProgress.upsert.mock.calls[0][0];
      expect(arg.where.userId_datasetId_sheet_cardKey.sheet).toBe('214 bộ thủ');
      expect(arg.create.sheet).toBe('214 bộ thủ');
    });
  });

  describe('getProgress', () => {
    it('throws NotFoundException when dataset does not belong to user', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue(null);
      await expect(service.getProgress('user-1', 'ds-99')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns progress items for the user + dataset + sheet', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue({ id: 'ds-1' });
      mockPrisma.studyProgress.findMany.mockResolvedValue([
        { cardKey: 'k-1', status: 'known', seenCount: 2, lastReviewedAt: null },
      ]);

      const result = await service.getProgress('user-1', 'ds-1', 'HSK 1');

      expect(mockPrisma.studyProgress.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', datasetId: 'ds-1', sheet: 'HSK 1' },
        }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0].cardKey).toBe('k-1');
    });

    it('defaults sheet to "" when not provided', async () => {
      mockPrisma.dataset.findFirst.mockResolvedValue({ id: 'ds-1' });
      mockPrisma.studyProgress.findMany.mockResolvedValue([]);

      await service.getProgress('user-1', 'ds-1');

      expect(mockPrisma.studyProgress.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', datasetId: 'ds-1', sheet: '' },
        }),
      );
    });
  });
});
