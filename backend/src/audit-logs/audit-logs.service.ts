import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async log({
    userId,
    action,
    entity,
    entityId,
    metadata,
    ipAddress,
  }: {
    userId?: string;
    action: string;
    entity?: string;
    entityId?: string;
    metadata?: any;
    ipAddress?: string;
  }) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          entity,
          entityId,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
          ipAddress,
        },
      });
    } catch (error) {
      // Fail-safe: Don't block the main application flow if logging fails
      console.error('Failed to write audit log:', error);
    }
  }
}
