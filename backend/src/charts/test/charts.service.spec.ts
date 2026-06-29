import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ChartsService } from '../charts.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  dataset: { findFirst: jest.fn() },
  dashboard: { findFirst: jest.fn(), create: jest.fn() },
  chart: { create: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
  $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
};

const config = { type: 'line', title: 'Xu hướng', config: { series: [] } };

describe('ChartsService', () => {
  let service: ChartsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ChartsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(ChartsService);
    jest.clearAllMocks();
  });

  it('throws NotFoundException when dataset does not belong to user', async () => {
    mockPrisma.dataset.findFirst.mockResolvedValue(null);
    await expect(
      service.saveChart('user-1', { datasetId: 'ds-99', ...config }),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates default dashboard when user has none', async () => {
    mockPrisma.dataset.findFirst.mockResolvedValue({ id: 'ds-1' });
    mockPrisma.dashboard.findFirst.mockResolvedValue(null);
    mockPrisma.dashboard.create.mockResolvedValue({ id: 'dash-new', name: 'Dashboard của tôi' });
    mockPrisma.chart.create.mockResolvedValue({ id: 'chart-1' });

    await service.saveChart('user-1', { datasetId: 'ds-1', ...config });

    expect(mockPrisma.dashboard.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1' }) }),
    );
  });

  it('reuses existing dashboard when user already has one', async () => {
    mockPrisma.dataset.findFirst.mockResolvedValue({ id: 'ds-1' });
    mockPrisma.dashboard.findFirst.mockResolvedValue({ id: 'dash-existing' });
    mockPrisma.chart.create.mockResolvedValue({ id: 'chart-1' });

    await service.saveChart('user-1', { datasetId: 'ds-1', ...config });

    expect(mockPrisma.dashboard.create).not.toHaveBeenCalled();
  });

  it('creates chart record with correct fields', async () => {
    mockPrisma.dataset.findFirst.mockResolvedValue({ id: 'ds-1' });
    mockPrisma.dashboard.findFirst.mockResolvedValue({ id: 'dash-1' });
    mockPrisma.chart.create.mockResolvedValue({ id: 'chart-1', dashboardId: 'dash-1' });

    const result = await service.saveChart('user-1', { datasetId: 'ds-1', ...config });

    expect(mockPrisma.chart.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dashboardId: 'dash-1',
          datasetId: 'ds-1',
          type: 'line',
          title: 'Xu hướng',
          config: { series: [] },
        }),
      }),
    );
    expect(result.dashboardId).toBe('dash-1');
  });

  it('returns chart and dashboardId', async () => {
    mockPrisma.dataset.findFirst.mockResolvedValue({ id: 'ds-1' });
    mockPrisma.dashboard.findFirst.mockResolvedValue({ id: 'dash-1' });
    mockPrisma.chart.create.mockResolvedValue({ id: 'chart-42', dashboardId: 'dash-1' });

    const result = await service.saveChart('user-1', { datasetId: 'ds-1', ...config });

    expect(result.chart.id).toBe('chart-42');
    expect(result.dashboardId).toBe('dash-1');
  });

  describe('listCharts', () => {
    it('returns charts belonging to the user dashboards, oldest first', async () => {
      mockPrisma.chart.findMany.mockResolvedValue([
        { id: 'c-1', type: 'line', title: 'A', config: {}, createdAt: new Date() },
        { id: 'c-2', type: 'bar', title: 'B', config: {}, createdAt: new Date() },
      ]);

      const result = await service.listCharts('user-1');

      expect(result.charts).toHaveLength(2);
      expect(mockPrisma.chart.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { dashboard: { userId: 'user-1' } },
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('returns empty array when user has no charts', async () => {
      mockPrisma.chart.findMany.mockResolvedValue([]);
      const result = await service.listCharts('user-1');
      expect(result.charts).toEqual([]);
    });

    it('includes position in the selected fields', async () => {
      mockPrisma.chart.findMany.mockResolvedValue([]);
      await service.listCharts('user-1');
      expect(mockPrisma.chart.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({ position: true }),
        }),
      );
    });
  });

  describe('updateLayout', () => {
    const layout = [
      { id: 'c-1', x: 0, y: 0, w: 6, h: 7 },
      { id: 'c-2', x: 6, y: 0, w: 6, h: 7 },
    ];

    beforeEach(() => mockPrisma.chart.updateMany.mockResolvedValue({ count: 1 }));

    it('updates each chart position, guarded by dashboard owner', async () => {
      await service.updateLayout('user-1', layout);
      expect(mockPrisma.chart.updateMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.chart.updateMany).toHaveBeenCalledWith({
        where: { id: 'c-1', dashboard: { userId: 'user-1' } },
        data: { position: { x: 0, y: 0, w: 6, h: 7 } },
      });
    });

    it('runs updates in a single transaction and returns count', async () => {
      const result = await service.updateLayout('user-1', layout);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ updated: 2 });
    });
  });
});
