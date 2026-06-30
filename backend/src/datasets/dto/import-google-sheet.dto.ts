import { IsString, IsUrl } from 'class-validator';

export class ImportGoogleSheetDto {
  @IsUrl({}, { message: 'Đường dẫn Google Sheet không hợp lệ.' })
  url: string;
}
