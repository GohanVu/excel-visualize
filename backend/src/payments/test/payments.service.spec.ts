import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from '../payments.service';
import { PrismaService } from '../../prisma/prisma.service';

// Mock PayOS
jest.mock('@payos/node', () => {
  return {
    PayOS: jest.fn().mockImplementation(() => {
      return {
        paymentRequests: {
          create: jest.fn(),
        },
        webhooks: {
          verify: jest.fn(),
        },
      };
    }),
  };
});

const mockPrisma = {
  paymentTransaction: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  subscription: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => {
    if (key === 'PAYOS_CLIENT_ID') return 'mock-client-id';
    if (key === 'PAYOS_API_KEY') return 'mock-api-key';
    if (key === 'PAYOS_CHECKSUM_KEY') return 'mock-checksum-key';
    return '';
  }),
  get: jest.fn((key: string) => {
    if (key === 'FRONTEND_URL') return 'http://localhost:5174';
    return '';
  }),
};

describe('PaymentsService', () => {
  let service: PaymentsService;
  let payOSInstance: any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    payOSInstance = (service as any).payOS;
    jest.clearAllMocks();
  });

  describe('createPaymentLink', () => {
    it('throws BadRequestException for invalid duration', async () => {
      await expect(service.createPaymentLink('user-1', 2)).rejects.toThrow(BadRequestException);
    });

    it('creates payment link and saves transaction to db', async () => {
      mockPrisma.paymentTransaction.findUnique.mockResolvedValue(null);
      payOSInstance.paymentRequests.create.mockResolvedValue({
        paymentLinkId: 'link-123',
        checkoutUrl: 'https://checkout.payos.vn/pay/link-123',
      });

      const res = await service.createPaymentLink('user-1', 1);

      expect(res).toBeDefined();
      expect(res.checkoutUrl).toBe('https://checkout.payos.vn/pay/link-123');
      expect(res.durationMonths).toBe(1);
      expect(mockPrisma.paymentTransaction.create).toHaveBeenCalled();
    });
  });

  describe('handleWebhook', () => {
    it('updates transaction to PAID and activates pro plan on successful payment webhook', async () => {
      const webhookBody = {
        data: {
          orderCode: 123456,
          amount: 99000,
          code: '00',
        },
      };

      payOSInstance.webhooks.verify.mockResolvedValue(webhookBody.data);
      mockPrisma.paymentTransaction.findUnique.mockResolvedValue({
        userId: 'user-1',
        orderCode: 123456,
        amount: 99000,
        durationMonths: 1,
        status: 'PENDING',
      });

      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const res = await service.handleWebhook(webhookBody, '');

      expect(res.success).toBe(true);
      expect(mockPrisma.paymentTransaction.update).toHaveBeenCalledWith({
        where: { orderCode: 123456 },
        data: { status: 'PAID' },
      });
      expect(mockPrisma.subscription.upsert).toHaveBeenCalled();
    });

    it('updates transaction to CANCELLED on payment cancellation webhook', async () => {
      const webhookBody = {
        data: {
          orderCode: 123456,
          amount: 99000,
          code: '01', // Thất bại / hủy
        },
      };

      payOSInstance.webhooks.verify.mockResolvedValue(webhookBody.data);
      mockPrisma.paymentTransaction.findUnique.mockResolvedValue({
        userId: 'user-1',
        orderCode: 123456,
        amount: 99000,
        durationMonths: 1,
        status: 'PENDING',
      });

      const res = await service.handleWebhook(webhookBody, '');

      expect(res.success).toBe(true);
      expect(mockPrisma.paymentTransaction.update).toHaveBeenCalledWith({
        where: { orderCode: 123456 },
        data: { status: 'CANCELLED' },
      });
    });
  });
});
