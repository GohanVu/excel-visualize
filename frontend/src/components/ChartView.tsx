import ReactECharts from 'echarts-for-react';
import type { ChartOption } from '../lib/buildChartOption';

interface ChartViewProps {
  option: ChartOption;
  height?: number;
}

/** Wrapper mỏng quanh echarts-for-react để thống nhất style + dễ mock trong test */
export default function ChartView({ option, height = 240 }: ChartViewProps) {
  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'svg' }}
      notMerge
    />
  );
}
