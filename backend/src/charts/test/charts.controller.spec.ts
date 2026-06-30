import { Test } from '@nestjs/testing';
import { ChartsController } from '../charts.controller';
import { ChartsService } from '../charts.service';

const mockService = {
  saveChart: jest.fn(),
  listCharts: jest.fn(),
  updateChart: jest.fn(),
};
const mockUser = { id: 'user-1' } as any;

describe('ChartsController', () => {
  let controller: ChartsController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ChartsController],
      providers: [{ provide: ChartsService, useValue: mockService }],
    }).compile();
    controller = module.get(ChartsController);
    jest.clearAllMocks();
  });

  it('POST /charts → delegates to service.saveChart with userId', async () => {
    const dto = {
      datasetId: 'ds-1',
      type: 'line',
      title: 'Xu hướng',
      config: { series: [] },
    };
    mockService.saveChart.mockResolvedValue({ chart: { id: 'c-1' }, dashboardId: 'd-1' });

    const result = await controller.save(mockUser, dto as any);

    expect(mockService.saveChart).toHaveBeenCalledWith('user-1', dto);
    expect(result.dashboardId).toBe('d-1');
  });

  it('GET /charts → delegates to service.listCharts with userId', async () => {
    mockService.listCharts.mockResolvedValue({ charts: [{ id: 'c-1' }] });
    const result = await controller.list(mockUser);
    expect(mockService.listCharts).toHaveBeenCalledWith('user-1');
    expect(result.charts).toHaveLength(1);
  });

  it('PATCH /charts/:id → delegates to service.updateChart with userId + id + dto', async () => {
    const dto = { title: 'Tên mới', config: { color: ['#fff'] } };
    mockService.updateChart.mockResolvedValue({ updated: true });

    const result = await controller.update(mockUser, 'c-1', dto as any);

    expect(mockService.updateChart).toHaveBeenCalledWith('user-1', 'c-1', dto);
    expect(result).toEqual({ updated: true });
  });
});
