import { IsString, IsNumber, Min } from 'class-validator';

export class ConfirmUploadDto {
  @IsString()
  objectKey: string;

  @IsString()
  originalFilename: string;

  @IsNumber()
  @Min(1)
  fileSize: number;

  @IsString()
  mimeType: string;
}
