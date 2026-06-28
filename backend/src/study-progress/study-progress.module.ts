import { Module } from '@nestjs/common';
import { StudyProgressController } from './study-progress.controller';
import { StudyProgressService } from './study-progress.service';

@Module({
  controllers: [StudyProgressController],
  providers: [StudyProgressService],
})
export class StudyProgressModule {}
