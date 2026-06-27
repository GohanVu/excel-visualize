import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DatasetsService } from './datasets.service';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { SuggestChartsDto } from './dto/suggest-charts.dto';

@Controller('datasets')
@UseGuards(JwtAuthGuard)
export class DatasetsController {
  constructor(private readonly datasetsService: DatasetsService) {}

  @Post('presign')
  presign(@CurrentUser() user: User, @Body() dto: PresignUploadDto) {
    return this.datasetsService.presignUpload(user, dto);
  }

  @Post()
  confirm(@CurrentUser() user: User, @Body() dto: ConfirmUploadDto) {
    return this.datasetsService.confirmUpload(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.datasetsService.findAllByUser(user.id);
  }

  @Get(':id/columns')
  columns(@CurrentUser() user: User, @Param('id') id: string) {
    return this.datasetsService.parseDataset(user.id, id);
  }

  @Post(':id/suggest')
  suggest(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: SuggestChartsDto,
  ) {
    return this.datasetsService.suggestCharts(user.id, id, dto.columns);
  }
}
