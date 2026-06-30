import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SaveChartDto } from './dto/save-chart.dto';
import { LayoutItemDto } from './dto/update-layout.dto';
import { UpdateChartDto } from './dto/update-chart.dto';

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
        position: true,
        createdAt: true,
      },
    });

    return { charts };
  }

  // Lưu vị trí/kích thước các chart sau khi user kéo-thả/resize (react-grid-layout).
  // updateMany lọc theo dashboard.userId → chỉ sửa chart của chính user (owner-guard).
  async updateLayout(userId: string, layout: LayoutItemDto[]) {
    await this.prisma.$transaction(
      layout.map((it) =>
        this.prisma.chart.updateMany({
          where: { id: it.id, dashboard: { userId } },
          data: { position: { x: it.x, y: it.y, w: it.w, h: it.h } },
        }),
      ),
    );
    return { updated: layout.length };
  }

  // Cập nhật tiêu đề và/hoặc config (panel tuỳ chỉnh P2-T5).
  // updateMany lọc dashboard.userId → owner-guard; count 0 → 404 (không lộ).
  // Chỉ set field được gửi (title/config) — bỏ qua field undefined để khỏi ghi đè nhầm.
  async updateChart(userId: string, chartId: string, dto: UpdateChartDto) {
    const data: Prisma.ChartUpdateManyMutationInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.config !== undefined) data.config = dto.config as Prisma.InputJsonValue;

    const res = await this.prisma.chart.updateMany({
      where: { id: chartId, dashboard: { userId } },
      data,
    });
    if (res.count === 0) throw new NotFoundException('Biểu đồ không tồn tại.');
    return { updated: true };
  }

  // Xoá 1 chart khỏi dashboard. deleteMany lọc dashboard.userId → owner-guard.
  // count 0 = không phải chart của user (hoặc không tồn tại) → 404 (không lộ).
  async deleteChart(userId: string, chartId: string) {
    const res = await this.prisma.chart.deleteMany({
      where: { id: chartId, dashboard: { userId } },
    });
    if (res.count === 0) throw new NotFoundException('Biểu đồ không tồn tại.');
    return { deleted: true };
  }
}
