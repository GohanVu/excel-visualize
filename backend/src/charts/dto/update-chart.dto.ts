import { IsOptional, IsString, IsObject, MaxLength } from 'class-validator';

// Cập nhật 1 chart từ panel tuỳ chỉnh (P2-T5): đổi tiêu đề và/hoặc config (màu, theme).
export class UpdateChartDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
