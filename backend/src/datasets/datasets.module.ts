import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { ParserModule } from '../parser/parser.module';
import { SuggesterModule } from '../suggester/suggester.module';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';

@Module({
  imports: [StorageModule, ParserModule, SuggesterModule],
  controllers: [DatasetsController],
  providers: [DatasetsService],
  exports: [DatasetsService],
})
export class DatasetsModule {}
