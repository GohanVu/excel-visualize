import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChartsService } from './charts.service';
import { SaveChartDto } from './dto/save-chart.dto';

@Controller('charts')
@UseGuards(JwtAuthGuard)
export class ChartsController {
  constructor(private readonly chartsService: ChartsService) {}

  @Post()
  save(@CurrentUser() user: User, @Body() dto: SaveChartDto) {
    return this.chartsService.saveChart(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: User) {
    return this.chartsService.listCharts(user.id);
  }
}
