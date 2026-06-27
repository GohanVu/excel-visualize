import { IsArray, IsInt, ArrayMinSize, Min } from 'class-validator';

export class SuggestChartsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  columns: number[];
}
