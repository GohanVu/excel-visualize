import { Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { User } from '@prisma/client';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-link')
  async createPaymentLink(
    @CurrentUser() user: User,
    @Body('durationMonths') durationMonths: number,
  ) {
    return this.paymentsService.createPaymentLink(user.id, durationMonths);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    return this.paymentsService.handleWebhook(body, '');
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/:orderCode')
  async getTransactionStatus(
    @CurrentUser() user: User,
    @Param('orderCode') orderCode: string,
  ) {
    return this.paymentsService.getTransactionStatus(user.id, parseInt(orderCode, 10));
  }
}
