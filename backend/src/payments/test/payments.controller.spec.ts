import { Test } from '@nestjs/testing';
import { PaymentsController } from '../payments.controller';
import { PaymentsService } from '../payments.service';

const mockPaymentsService = {
  createPaymentLink: jest.fn(),
  handleWebhook: jest.fn(),
  getTransactionStatus: jest.fn(),
};

describe('PaymentsController', () => {
  let controller: PaymentsController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: mockPaymentsService },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    jest.clearAllMocks();
  });

  describe('createPaymentLink', () => {
    it('delegates to PaymentsService.createPaymentLink', async () => {
      mockPaymentsService.createPaymentLink.mockResolvedValue({ checkoutUrl: 'url' });
      const user = { id: 'user-1' } as any;

      const res = await controller.createPaymentLink(user, 1);

      expect(res).toEqual({ checkoutUrl: 'url' });
      expect(mockPaymentsService.createPaymentLink).toHaveBeenCalledWith('user-1', 1);
    });
  });

  describe('handleWebhook', () => {
    it('delegates to PaymentsService.handleWebhook', async () => {
      mockPaymentsService.handleWebhook.mockResolvedValue({ success: true });
      const body = { data: 'test' };

      const res = await controller.handleWebhook(body);

      expect(res).toEqual({ success: true });
      expect(mockPaymentsService.handleWebhook).toHaveBeenCalledWith(body, '');
    });
  });

  describe('getTransactionStatus', () => {
    it('delegates to PaymentsService.getTransactionStatus', async () => {
      mockPaymentsService.getTransactionStatus.mockResolvedValue({ status: 'PAID' });
      const user = { id: 'user-1' } as any;

      const res = await controller.getTransactionStatus(user, '123456');

      expect(res).toEqual({ status: 'PAID' });
      expect(mockPaymentsService.getTransactionStatus).toHaveBeenCalledWith('user-1', 123456);
    });
  });
});
