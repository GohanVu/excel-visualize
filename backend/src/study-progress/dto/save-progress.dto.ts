import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { StudyStatus } from '@prisma/client';

// Lưu tiến độ học 1 thẻ (flashcard/quiz). cardKey do FE tính (hash giá trị dòng)
// để ổn định qua re-parse — xem schema StudyProgress.
export class SaveProgressDto {
  @IsString()
  @IsNotEmpty()
  datasetId: string;

  // Tab (worksheet) — không có → "" (tab mặc định), khớp default ở schema
  @IsOptional()
  @IsString()
  sheet?: string;

  @IsString()
  @IsNotEmpty()
  cardKey: string;

  @IsEnum(StudyStatus)
  status: StudyStatus;
}
