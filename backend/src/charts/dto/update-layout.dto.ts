import {
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// 1 ô trong lưới dashboard (react-grid-layout): vị trí x,y + kích thước w,h (đơn vị cột/hàng)
export class LayoutItemDto {
  @IsString()
  id: string;

  @IsInt()
  @Min(0)
  x: number;

  @IsInt()
  @Min(0)
  y: number;

  @IsInt()
  @Min(1)
  w: number;

  @IsInt()
  @Min(1)
  h: number;
}

export class UpdateLayoutDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LayoutItemDto)
  layout: LayoutItemDto[];
}
