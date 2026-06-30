import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardsService {
  constructor(private prisma: PrismaService) {}

  // Dashboard mặc định của user (đầu tiên theo thứ tự tạo). Tạo lười khi lưu chart
  // (charts.service) nên có thể chưa tồn tại → trả null, FE ẩn phần đổi tên.
  async getDefault(userId: string) {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    });
    return { dashboard };
  }

  // Đổi tên. updateMany lọc theo userId → owner-guard; count 0 → 404 (không lộ).
  async rename(userId: string, dashboardId: string, rawName: string) {
    const name = rawName.trim();
    if (!name) throw new BadRequestException('Tên dashboard không được để trống.');

    const res = await this.prisma.dashboard.updateMany({
      where: { id: dashboardId, userId },
      data: { name },
    });
    if (res.count === 0) throw new NotFoundException('Dashboard không tồn tại.');
    return { id: dashboardId, name };
  }
}
