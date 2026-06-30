import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { ParserModule } from '../parser/parser.module';
import { SuggesterModule } from '../suggester/suggester.module';
import { AuthModule } from '../auth/auth.module';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';
import { DatasetsSyncService } from './datasets-sync.service';

@Module({
  imports: [StorageModule, ParserModule, SuggesterModule, AuthModule],
  controllers: [DatasetsController],
  providers: [DatasetsService, DatasetsSyncService],
  exports: [DatasetsService],
})
export class DatasetsModule {}
