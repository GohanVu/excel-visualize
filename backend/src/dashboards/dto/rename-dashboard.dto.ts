import { IsString, MaxLength } from 'class-validator';

// Đổi tên dashboard (P2-T7). Trim + chặn rỗng thực hiện ở service.
export class RenameDashboardDto {
  @IsString()
  @MaxLength(100)
  name: string;
}
