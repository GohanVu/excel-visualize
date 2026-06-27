import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class SaveChartDto {
  @IsString()
  @IsNotEmpty()
  datasetId: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsObject()
  config: Record<string, unknown>;
}
