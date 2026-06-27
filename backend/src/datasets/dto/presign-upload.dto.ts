import { IsString, IsNumber, IsIn, Min } from 'class-validator';

const ALLOWED_MIME = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

export class PresignUploadDto {
  @IsString()
  filename: string;

  @IsIn(ALLOWED_MIME)
  contentType: string;

  @IsNumber()
  @Min(1)
  fileSize: number;
}
