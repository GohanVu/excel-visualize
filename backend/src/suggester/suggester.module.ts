import { Module } from '@nestjs/common';
import { ChartSuggesterService } from './chart-suggester.service';

@Module({
  providers: [ChartSuggesterService],
  exports: [ChartSuggesterService],
})
export class SuggesterModule {}
