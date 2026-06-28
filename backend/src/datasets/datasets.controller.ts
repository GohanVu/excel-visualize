import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
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

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.datasetsService.deleteDataset(user.id, id);
  }

  @Get(':id/columns')
  columns(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('sheet') sheet?: string,
    @Query('headerRow') headerRow?: string,
  ) {
    const hr = headerRow != null ? parseInt(headerRow, 10) : NaN;
    return this.datasetsService.parseDataset(
      user.id,
      id,
      sheet,
      Number.isFinite(hr) ? hr : undefined,
    );
  }

  @Get(':id/rows')
  rows(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('sheet') sheet?: string,
    @Query('headerRow') headerRow?: string,
  ) {
    const hr = headerRow != null ? parseInt(headerRow, 10) : NaN;
    return this.datasetsService.getRows(
      user.id,
      id,
      sheet,
      Number.isFinite(hr) ? hr : undefined,
    );
  }

  @Post(':id/suggest')
  suggest(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: SuggestChartsDto,
  ) {
    return this.datasetsService.suggestCharts(user.id, id, dto.columns, {
      sheetName: dto.sheet,
      headerRow: dto.headerRow,
      typeOverrides: dto.typeOverrides,
    });
  }
}
