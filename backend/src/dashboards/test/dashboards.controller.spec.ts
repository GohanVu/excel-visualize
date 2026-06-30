import { Test } from '@nestjs/testing';
import { DashboardsController } from '../dashboards.controller';
import { DashboardsService } from '../dashboards.service';

const mockService = { getDefault: jest.fn(), rename: jest.fn() };
const mockUser = { id: 'user-1' } as any;

describe('DashboardsController', () => {
  let controller: DashboardsController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [DashboardsController],
      providers: [{ provide: DashboardsService, useValue: mockService }],
    }).compile();
    controller = module.get(DashboardsController);
    jest.clearAllMocks();
  });

  it('GET /dashboards/default → delegates to service.getDefault with userId', async () => {
    mockService.getDefault.mockResolvedValue({ dashboard: null });
    await controller.getDefault(mockUser);
    expect(mockService.getDefault).toHaveBeenCalledWith('user-1');
  });

  it('PATCH /dashboards/:id → delegates to service.rename with userId + name', async () => {
    mockService.rename.mockResolvedValue({ id: 'dash-1', name: 'Mới' });
    await controller.rename(mockUser, 'dash-1', { name: 'Mới' } as any);
    expect(mockService.rename).toHaveBeenCalledWith('user-1', 'dash-1', 'Mới');
  });
});
