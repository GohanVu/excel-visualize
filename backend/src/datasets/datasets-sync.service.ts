import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DatasetsService } from './datasets.service';

@Injectable()
export class DatasetsSyncService {
  private readonly logger = new Logger(DatasetsSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly datasetsService: DatasetsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleAutoSync() {
    this.logger.log('Bắt đầu quét tự động đồng bộ Google Sheets...');

    const datasets = await this.prisma.dataset.findMany({
      where: {
        googleSpreadsheetId: { not: null },
        user: {
          subscription: {
            plan: 'pro',
            status: 'active',
          },
        },
      },
    });

    this.logger.log(`Tìm thấy ${datasets.length} sheet của người dùng Pro cần đồng bộ.`);

    for (const dataset of datasets) {
      try {
        await this.datasetsService.syncGoogleSheet(dataset.userId, dataset.id);
        this.logger.log(`Đồng bộ tự động thành công: ${dataset.name} (ID: ${dataset.id})`);
      } catch (err: any) {
        this.logger.error(
          `Đồng bộ tự động thất bại: ${dataset.name} (ID: ${dataset.id}). Lỗi: ${err.message}`,
        );
      }
    }
  }
}
