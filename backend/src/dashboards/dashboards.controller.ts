import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardsService } from './dashboards.service';
import { RenameDashboardDto } from './dto/rename-dashboard.dto';

@Controller('dashboards')
@UseGuards(JwtAuthGuard)
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Get('default')
  getDefault(@CurrentUser() user: User) {
    return this.dashboardsService.getDefault(user.id);
  }

  @Patch(':id')
  rename(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: RenameDashboardDto,
  ) {
    return this.dashboardsService.rename(user.id, id, dto.name);
  }
}
