import { Test } from '@nestjs/testing';
import { StudyProgressController } from '../study-progress.controller';
import { StudyProgressService } from '../study-progress.service';

const mockService = { saveProgress: jest.fn(), getProgress: jest.fn() };
const mockUser = { id: 'user-1' } as any;

describe('StudyProgressController', () => {
  let controller: StudyProgressController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [StudyProgressController],
      providers: [{ provide: StudyProgressService, useValue: mockService }],
    }).compile();
    controller = module.get(StudyProgressController);
    jest.clearAllMocks();
  });

  it('POST /study-progress → delegates to service.saveProgress with userId', async () => {
    const dto = { datasetId: 'ds-1', cardKey: 'k-1', status: 'known' };
    mockService.saveProgress.mockResolvedValue({ id: 'sp-1' });

    await controller.save(mockUser, dto as any);

    expect(mockService.saveProgress).toHaveBeenCalledWith('user-1', dto);
  });

  it('GET /study-progress/:datasetId → delegates with userId + sheet', async () => {
    mockService.getProgress.mockResolvedValue({ items: [] });

    await controller.get(mockUser, 'ds-1', 'HSK 1');

    expect(mockService.getProgress).toHaveBeenCalledWith('user-1', 'ds-1', 'HSK 1');
  });

  it('GET without sheet query → defaults sheet to ""', async () => {
    mockService.getProgress.mockResolvedValue({ items: [] });

    await controller.get(mockUser, 'ds-1', undefined);

    expect(mockService.getProgress).toHaveBeenCalledWith('user-1', 'ds-1', '');
  });
});
