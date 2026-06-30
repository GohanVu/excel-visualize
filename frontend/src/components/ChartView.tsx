import ReactECharts from 'echarts-for-react';
import { forwardRef } from 'react';
import type { ChartOption } from '../lib/buildChartOption';

interface ChartViewProps {
  option: ChartOption;
  height?: number;
  renderer?: 'svg' | 'canvas';
}

/** Wrapper mỏng quanh echarts-for-react để thống nhất style + dễ mock trong test */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChartView = forwardRef<any, ChartViewProps>(function ChartView(
  { option, height = 240, renderer = 'svg' },
  ref,
) {
  return (
    <ReactECharts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer }}
      notMerge
    />
  );
});

export default ChartView;
