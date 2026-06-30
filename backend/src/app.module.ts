import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DatasetsModule } from './datasets/datasets.module';
import { ChartsModule } from './charts/charts.module';
import { DashboardsModule } from './dashboards/dashboards.module';
import { StudyProgressModule } from './study-progress/study-progress.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AdminModule } from './admin/admin.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    DatasetsModule,
    ChartsModule,
    DashboardsModule,
    StudyProgressModule,
    AuditLogsModule,
    AdminModule,
    PaymentsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
