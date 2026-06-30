import { Test } from '@nestjs/testing';
import { AdminController } from '../admin.controller';
import { AdminService } from '../admin.service';
import { Role, SubscriptionPlan } from '@prisma/client';

const mockAdmin = {
  id: 'admin-1',
  email: 'admin@chartly.vn',
  role: Role.admin,
};

const mockAdminService = {
  getUsers: jest.fn(),
  overrideUserPlan: jest.fn(),
  getStats: jest.fn(),
  getAuditLogs: jest.fn(),
};

describe('AdminController', () => {
  let controller: AdminController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockAdminService }],
    }).compile();

    controller = module.get(AdminController);
  });

  it('getUsers delegates to service', async () => {
    mockAdminService.getUsers.mockResolvedValue([]);
    const result = await controller.getUsers();
    expect(mockAdminService.getUsers).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('overrideUserPlan delegates to service', async () => {
    mockAdminService.overrideUserPlan.mockResolvedValue({ plan: SubscriptionPlan.pro });
    const result = await controller.overrideUserPlan(mockAdmin as any, 'user-1', { plan: SubscriptionPlan.pro });
    expect(mockAdminService.overrideUserPlan).toHaveBeenCalledWith('admin-1', 'user-1', SubscriptionPlan.pro);
    expect(result).toEqual({ plan: SubscriptionPlan.pro });
  });

  it('getStats delegates to service', async () => {
    mockAdminService.getStats.mockResolvedValue({ totalUsers: 10 });
    const result = await controller.getStats();
    expect(mockAdminService.getStats).toHaveBeenCalled();
    expect(result).toEqual({ totalUsers: 10 });
  });

  it('getAuditLogs delegates to service', async () => {
    mockAdminService.getAuditLogs.mockResolvedValue({ logs: [] });
    const result = await controller.getAuditLogs(1, 10);
    expect(mockAdminService.getAuditLogs).toHaveBeenCalledWith(1, 10);
    expect(result).toEqual({ logs: [] });
  });
});
