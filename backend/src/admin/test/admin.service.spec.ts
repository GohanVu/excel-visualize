import { Test } from '@nestjs/testing';
import { AdminService } from '../admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { Role, SubscriptionPlan } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'Normal User',
  role: Role.user,
};

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  subscription: {
    upsert: jest.fn(),
    count: jest.fn(),
  },
  chart: {
    count: jest.fn(),
  },
  dataset: {
    count: jest.fn(),
  },
  auditLog: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const mockAuditLogs = {
  log: jest.fn(),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogsService, useValue: mockAuditLogs },
      ],
    }).compile();

    service = module.get(AdminService);
  });

  describe('getUsers', () => {
    it('returns users with subscription details', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      const result = await service.getUsers();
      expect(mockPrisma.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([mockUser]);
    });
  });

  describe('overrideUserPlan', () => {
    it('throws NotFoundException if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.overrideUserPlan('admin-1', 'invalid', SubscriptionPlan.pro)).rejects.toThrow(NotFoundException);
    });

    it('upserts subscription and logs action', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.subscription.upsert.mockResolvedValue({ id: 'sub-1', plan: SubscriptionPlan.pro });

      const result = await service.overrideUserPlan('admin-1', 'user-1', SubscriptionPlan.pro);

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: { plan: SubscriptionPlan.pro, status: 'active' },
        create: { userId: 'user-1', plan: SubscriptionPlan.pro, status: 'active' },
      });
      expect(mockAuditLogs.log).toHaveBeenCalledWith({
        userId: 'admin-1',
        action: 'admin.override_plan',
        entity: 'User',
        entityId: 'user-1',
        metadata: { targetEmail: mockUser.email, plan: SubscriptionPlan.pro },
      });
      expect(result).toEqual({ id: 'sub-1', plan: SubscriptionPlan.pro });
    });
  });

  describe('getStats', () => {
    it('counts total users, charts, datasets, and pro users', async () => {
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.chart.count.mockResolvedValue(5);
      mockPrisma.dataset.count.mockResolvedValue(8);
      mockPrisma.subscription.count.mockResolvedValue(2);

      const result = await service.getStats();

      expect(result).toEqual({
        totalUsers: 10,
        totalCharts: 5,
        totalDatasets: 8,
        proUsers: 2,
      });
    });
  });

  describe('getAuditLogs', () => {
    it('returns paginated audit logs', async () => {
      const mockLogs = [{ id: 'log-1', action: 'test' }];
      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await service.getAuditLogs(1, 10);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, name: true } } },
      });
      expect(result).toEqual({
        logs: mockLogs,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });
});
