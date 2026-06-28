import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StudyProgressService } from './study-progress.service';
import { SaveProgressDto } from './dto/save-progress.dto';

@Controller('study-progress')
@UseGuards(JwtAuthGuard)
export class StudyProgressController {
  constructor(private readonly studyProgressService: StudyProgressService) {}

  @Post()
  save(@CurrentUser() user: User, @Body() dto: SaveProgressDto) {
    return this.studyProgressService.saveProgress(user.id, dto);
  }

  @Get(':datasetId')
  get(
    @CurrentUser() user: User,
    @Param('datasetId') datasetId: string,
    @Query('sheet') sheet?: string,
  ) {
    return this.studyProgressService.getProgress(user.id, datasetId, sheet ?? '');
  }
}
