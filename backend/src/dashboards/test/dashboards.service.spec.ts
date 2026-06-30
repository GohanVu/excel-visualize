import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DashboardsService } from '../dashboards.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';

const mockPrisma = {
  dashboard: { findFirst: jest.fn(), updateMany: jest.fn() },
};

const mockAuditLogs = {
  log: jest.fn(),
};

describe('DashboardsService', () => {
  let service: DashboardsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DashboardsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogsService, useValue: mockAuditLogs },
      ],
    }).compile();
    service = module.get(DashboardsService);
    jest.clearAllMocks();
  });

  describe('getDefault', () => {
    it('returns the oldest dashboard of the user (id + name)', async () => {
      mockPrisma.dashboard.findFirst.mockResolvedValue({ id: 'dash-1', name: 'Của tôi' });
      const result = await service.getDefault('user-1');
      expect(mockPrisma.dashboard.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          orderBy: { createdAt: 'asc' },
        }),
      );
      expect(result.dashboard).toEqual({ id: 'dash-1', name: 'Của tôi' });
    });

    it('returns null when the user has no dashboard yet', async () => {
      mockPrisma.dashboard.findFirst.mockResolvedValue(null);
      const result = await service.getDefault('user-1');
      expect(result.dashboard).toBeNull();
    });
  });

  describe('rename', () => {
    it('renames the dashboard guarded by owner', async () => {
      mockPrisma.dashboard.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.rename('user-1', 'dash-1', '  Doanh số 2026  ');
      expect(mockPrisma.dashboard.updateMany).toHaveBeenCalledWith({
        where: { id: 'dash-1', userId: 'user-1' },
        data: { name: 'Doanh số 2026' }, // đã trim
      });
      expect(result).toEqual({ id: 'dash-1', name: 'Doanh số 2026' });
    });

    it('rejects a blank/whitespace-only name', async () => {
      await expect(service.rename('user-1', 'dash-1', '   ')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.dashboard.updateMany).not.toHaveBeenCalled();
    });

    it("throws NotFound when the dashboard is not the user's (count 0)", async () => {
      mockPrisma.dashboard.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.rename('user-1', 'dash-x', 'Tên')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
