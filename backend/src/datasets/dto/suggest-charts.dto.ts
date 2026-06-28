import {
  IsArray,
  IsInt,
  ArrayMinSize,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';

export class SuggestChartsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  columns: number[];

  // Tab (worksheet) đang chọn — không có → tab đầu tiên
  @IsOptional()
  @IsString()
  sheet?: string;
}
