import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SaveChartDto } from './dto/save-chart.dto';

@Injectable()
export class ChartsService {
  constructor(private prisma: PrismaService) {}

  async saveChart(userId: string, dto: SaveChartDto) {
    const dataset = await this.prisma.dataset.findFirst({
      where: { id: dto.datasetId, userId },
    });
    if (!dataset) throw new NotFoundException('Dataset không tồn tại.');

    // Tìm hoặc tạo dashboard mặc định (dashboard đầu tiên của user theo thứ tự tạo)
    let dashboard = await this.prisma.dashboard.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (!dashboard) {
      dashboard = await this.prisma.dashboard.create({
        data: { userId, name: 'Dashboard của tôi' },
      });
    }

    const chart = await this.prisma.chart.create({
      data: {
        dashboardId: dashboard.id,
        datasetId: dto.datasetId,
        type: dto.type,
        title: dto.title ?? null,
        config: dto.config as Prisma.InputJsonValue,
      },
    });

    return { chart, dashboardId: dashboard.id };
  }

  // Load các chart đã lưu của user (qua dashboard mặc định) — dùng cho trang Dashboard
  async listCharts(userId: string) {
    const charts = await this.prisma.chart.findMany({
      where: { dashboard: { userId } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        type: true,
        title: true,
        config: true,
        createdAt: true,
      },
    });

    return { charts };
  }
}
