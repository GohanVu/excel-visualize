import {
  IsArray,
  IsInt,
  ArrayMinSize,
  Min,
  IsOptional,
  IsString,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ColumnType } from '@prisma/client';

// User sửa kiểu cột (confidence thấp) → override khi suggest
export class TypeOverrideDto {
  @IsInt()
  @Min(0)
  index: number;

  @IsEnum(ColumnType)
  type: ColumnType;
}

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

  // Dòng header user ép (khớp với /columns) — để index cột map đúng
  @IsOptional()
  @IsInt()
  @Min(0)
  headerRow?: number;

  // Kiểu cột user đã sửa tay
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TypeOverrideDto)
  typeOverrides?: TypeOverrideDto[];
}
