import { Module } from '@nestjs/common';
import { ParserService } from './parser.service';
import { ColumnTypeService } from './column-type.service';

@Module({
  providers: [ParserService, ColumnTypeService],
  exports: [ParserService, ColumnTypeService],
})
export class ParserModule {}
