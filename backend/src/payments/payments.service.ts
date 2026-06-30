import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private readonly payOS: PayOS;
  private readonly logger = new Logger(PaymentsService.name);

  // Mức giá cho các gói Pro
  private readonly PACKAGE_PRICES: Record<number, number> = {
    1: 99000,    // 1 tháng: 99k
    3: 249000,   // 3 tháng: 249k
    6: 449000,   // 6 tháng: 449k
    12: 799000,  // 12 tháng: 799k
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const clientId = this.configService.getOrThrow<string>('PAYOS_CLIENT_ID');
    const apiKey = this.configService.getOrThrow<string>('PAYOS_API_KEY');
    const checksumKey = this.configService.getOrThrow<string>('PAYOS_CHECKSUM_KEY');

    this.payOS = new PayOS({ clientId, apiKey, checksumKey });
  }

  async createPaymentLink(userId: string, durationMonths: number) {
    if (!this.PACKAGE_PRICES[durationMonths]) {
      throw new BadRequestException('Thời hạn đăng ký không hợp lệ. Chỉ chấp nhận các gói 1, 3, 6, 12 tháng.');
    }

    const amount = this.PACKAGE_PRICES[durationMonths];
    const orderCode = await this.generateUniqueOrderCode();
    const description = `Goi Pro Chartly ${durationMonths}T`;

    // Local host hoặc public production URL
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5174';
    const cancelUrl = `${frontendUrl}/payment/cancel?orderCode=${orderCode}`;
    const returnUrl = `${frontendUrl}/payment/success?orderCode=${orderCode}`;

    try {
      const paymentLink = await this.payOS.paymentRequests.create({
        orderCode,
        amount,
        description,
        cancelUrl,
        returnUrl,
      });

      // Lưu transaction vào DB
      await this.prisma.paymentTransaction.create({
        data: {
          userId,
          orderCode,
          amount,
          durationMonths,
          status: 'PENDING',
          paymentLinkId: paymentLink.paymentLinkId,
          checkoutUrl: paymentLink.checkoutUrl,
        },
      });

      return {
        orderCode,
        checkoutUrl: paymentLink.checkoutUrl,
        amount,
        durationMonths,
      };
    } catch (error) {
      this.logger.error(`Lỗi khi tạo link thanh toán PayOS cho user ${userId}:`, error);
      throw new BadRequestException('Không thể tạo link thanh toán VietQR. Vui lòng thử lại sau.');
    }
  }

  async handleWebhook(body: any, signature: string) {
    try {
      // Xác thực chữ ký webhook từ PayOS
      const webhookData = await this.payOS.webhooks.verify(body);
      const { orderCode, amount, code } = webhookData;

      this.logger.log(`Nhận Webhook PayOS cho đơn hàng ${orderCode}, status code: ${code}, số tiền: ${amount}`);

      const transaction = await this.prisma.paymentTransaction.findUnique({
        where: { orderCode },
      });

      if (!transaction) {
        this.logger.warn(`Không tìm thấy giao dịch với mã orderCode: ${orderCode}`);
        return { success: false, message: 'Giao dịch không tồn tại' };
      }

      if (transaction.status !== 'PENDING') {
        this.logger.log(`Giao dịch ${orderCode} đã được xử lý trước đó với trạng thái ${transaction.status}`);
        return { success: true, message: 'Giao dịch đã được xử lý' };
      }

      // code === "00" nghĩa là thanh toán thành công
      if (code === '00') {
        // Cập nhật transaction
        await this.prisma.paymentTransaction.update({
          where: { orderCode },
          data: { status: 'PAID' },
        });

        // Gia hạn gói Pro cho User
        await this.activateProPlan(transaction.userId, transaction.durationMonths);

        this.logger.log(`Giao dịch ${orderCode} thanh toán thành công. Đã gia hạn ${transaction.durationMonths} tháng Pro cho user ${transaction.userId}`);
      } else {
        // Hủy hoặc thất bại
        await this.prisma.paymentTransaction.update({
          where: { orderCode },
          data: { status: 'CANCELLED' },
        });
        this.logger.log(`Giao dịch ${orderCode} bị hủy hoặc thất bại.`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Lỗi khi verify webhook PayOS:', error);
      throw new BadRequestException('Webhook verification failed');
    }
  }

  async getTransactionStatus(userId: string, orderCode: number) {
    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: { orderCode, userId },
    });

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }

    return {
      orderCode: transaction.orderCode,
      status: transaction.status,
      amount: transaction.amount,
      durationMonths: transaction.durationMonths,
      updatedAt: transaction.updatedAt,
    };
  }

  private async generateUniqueOrderCode(): Promise<number> {
    let orderCode = Math.floor(Date.now() / 1000);
    while (true) {
      const exists = await this.prisma.paymentTransaction.findUnique({
        where: { orderCode },
      });
      if (!exists) {
        break;
      }
      orderCode += Math.floor(Math.random() * 10) + 1;
    }
    return orderCode;
  }

  private async activateProPlan(userId: string, durationMonths: number) {
    const now = new Date();
    const daysToAdd = durationMonths * 30; // Mặc định 1 tháng = 30 ngày

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    let newExpiredAt = new Date();
    newExpiredAt.setDate(now.getDate() + daysToAdd);

    if (subscription && subscription.plan === 'pro' && subscription.status === 'active' && subscription.expiredAt) {
      const currentExpiry = new Date(subscription.expiredAt);
      if (currentExpiry > now) {
        // Cộng dồn thời hạn nếu gói cũ vẫn còn hạn
        newExpiredAt = new Date(currentExpiry);
        newExpiredAt.setDate(currentExpiry.getDate() + daysToAdd);
      }
    }

    await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        plan: 'pro',
        status: 'active',
        paymentProvider: 'payos',
        expiredAt: newExpiredAt,
      },
      create: {
        userId,
        plan: 'pro',
        status: 'active',
        paymentProvider: 'payos',
        expiredAt: newExpiredAt,
      },
    });
  }
}
