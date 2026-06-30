import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChartsService } from './charts.service';
import { SaveChartDto } from './dto/save-chart.dto';
import { UpdateLayoutDto } from './dto/update-layout.dto';
import { UpdateChartDto } from './dto/update-chart.dto';

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

  @Patch('layout')
  updateLayout(@CurrentUser() user: User, @Body() dto: UpdateLayoutDto) {
    return this.chartsService.updateLayout(user.id, dto.layout);
  }

  // Khai báo SAU @Patch('layout') để route 'layout' không bị ':id' bắt nhầm.
  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateChartDto,
  ) {
    return this.chartsService.updateChart(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.chartsService.deleteChart(user.id, id);
  }
}
