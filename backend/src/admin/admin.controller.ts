import { Controller, Get, Patch, Body, Param, UseGuards, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('users')
  getUsers() {
    return this.adminService.getUsers();
  }

  @Patch('users/:id/plan')
  overrideUserPlan(
    @CurrentUser() admin: User,
    @Param('id') targetUserId: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.adminService.overrideUserPlan(admin.id, targetUserId, dto.plan);
  }

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('audit-logs')
  getAuditLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getAuditLogs(page, limit);
  }
}
