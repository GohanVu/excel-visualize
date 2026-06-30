import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            expiredAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async overrideUserPlan(adminId: string, targetUserId: string, plan: SubscriptionPlan) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại.');

    const subscription = await this.prisma.subscription.upsert({
      where: { userId: targetUserId },
      update: { plan, status: 'active' },
      create: {
        userId: targetUserId,
        plan,
        status: 'active',
      },
    });

    await this.auditLogs.log({
      userId: adminId,
      action: 'admin.override_plan',
      entity: 'User',
      entityId: targetUserId,
      metadata: { targetEmail: user.email, plan },
    });

    return subscription;
  }

  async getStats() {
    const [totalUsers, totalCharts, totalDatasets, proUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.chart.count(),
      this.prisma.dataset.count(),
      this.prisma.subscription.count({
        where: { plan: 'pro', status: 'active' },
      }),
    ]);

    return {
      totalUsers,
      totalCharts,
      totalDatasets,
      proUsers,
    };
  }

  async getAuditLogs(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
