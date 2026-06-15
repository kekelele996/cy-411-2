import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ActivityCategory } from '../../constants/activity';
import { formatActivityCategory } from '../../utils/formatters';

interface TrendPoint {
  date: string;
  value: number;
  category?: ActivityCategory;
}

interface CompareTrendSeries {
  name: string;
  key: 'current' | 'lastMonth' | 'lastYear';
  data: { date: string; value: number }[];
}

interface CarbonTrendChartProps {
  data?: TrendPoint[];
  compareSeries?: CompareTrendSeries[];
}

const SERIES_COLORS: Record<string, string> = {
  current: '#2f7d59',
  lastMonth: '#4a90d9',
  lastYear: '#e67e22'
};

export function CarbonTrendChart({ data, compareSeries }: CarbonTrendChartProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);

    if (compareSeries && compareSeries.length > 0) {
      const dates = compareSeries[0].data.map((item) => item.date);
      const series = compareSeries.map((s) => ({
        name: s.name,
        type: 'line' as const,
        smooth: true,
        symbol: s.key === 'current' ? 'circle' : 'none',
        lineStyle: {
          width: s.key === 'current' ? 3 : 2,
          type: s.key === 'current' ? 'solid' : 'dashed' as const,
          opacity: s.key === 'current' ? 1 : 0.7
        },
        itemStyle: { color: SERIES_COLORS[s.key] },
        areaStyle: s.key === 'current' ? { color: `${SERIES_COLORS[s.key]}20` } : undefined,
        data: s.data.map((item) => Number(item.value.toFixed(2)))
      }));

      chart.setOption({
        color: compareSeries.map((s) => SERIES_COLORS[s.key]),
        legend: {
          data: compareSeries.map((s) => s.name),
          top: 0,
          right: 0
        },
        grid: { left: 36, right: 16, top: 40, bottom: 32 },
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => {
            const lines = params.map((p: any) => `${p.marker}${p.seriesName}: ${p.value} kg CO2e`);
            return `${params[0].axisValue}<br/>${lines.join('<br/>')}`;
          }
        },
        xAxis: { type: 'category', boundaryGap: false, data: dates },
        yAxis: { type: 'value', name: 'kg CO2e' },
        series
      });
    } else if (data && data.length > 0) {
      const grouped = data.reduce<Record<string, number>>((acc, row) => {
        acc[row.date] = (acc[row.date] || 0) + row.value;
        return acc;
      }, {});
      const dates = Object.keys(grouped);
      chart.setOption({
        color: ['#2f7d59'],
        grid: { left: 36, right: 16, top: 20, bottom: 32 },
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => `${params[0].axisValue}<br/>${formatActivityCategory(data[params[0].dataIndex]?.category || ActivityCategory.ENERGY)} ${params[0].value} kg CO2e`
        },
        xAxis: { type: 'category', boundaryGap: false, data: dates },
        yAxis: { type: 'value', name: 'kg CO2e' },
        series: [
          {
            name: '排放量',
            type: 'line',
            smooth: true,
            areaStyle: { color: 'rgba(47, 125, 89, 0.12)' },
            data: dates.map((date) => Number(grouped[date].toFixed(2)))
          }
        ]
      });
    } else {
      chart.setOption({
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'center',
          textStyle: { color: '#999', fontSize: 14, fontWeight: 'normal' }
        },
        grid: { left: 36, right: 16, top: 20, bottom: 32 },
        xAxis: { type: 'category', boundaryGap: false, data: [] },
        yAxis: { type: 'value', name: 'kg CO2e' },
        series: []
      });
    }

    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      chart.dispose();
    };
  }, [data, compareSeries]);

  return <div className="chart-panel" ref={ref} />;
}
