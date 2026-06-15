import { useMemo } from 'react';
import dayjs from 'dayjs';
import { Activity } from '../types/entities';
import { ActivityCategory } from '../constants/activity';

export interface TrendPoint {
  date: string;
  value: number;
  category?: ActivityCategory;
}

export interface CompareTrendSeries {
  name: string;
  key: 'current' | 'lastMonth' | 'lastYear';
  data: { date: string; value: number }[];
}

export interface ComparisonResult {
  current: number;
  compare: number;
  diff: number;
  diffPercent: number;
  trend: 'up' | 'down' | 'flat';
}

export interface CarbonStatsResult {
  todayTotal: number;
  weekTotal: number;
  monthTotal: number;
  trend: TrendPoint[];
  lastMonthComparison: ComparisonResult;
  lastYearComparison: ComparisonResult;
  compareTrendSeries: CompareTrendSeries[];
}

function sumInRange(rows: Activity[], start: dayjs.Dayjs, end: dayjs.Dayjs) {
  return rows
    .filter((row) => {
      const d = dayjs(row.recordDate);
      return d.isAfter(start.subtract(1, 'day')) && d.isBefore(end.add(1, 'day'));
    })
    .reduce((sum, row) => sum + Number(row.carbonValue), 0);
}

function normalizeDateToCurrentMonth(dateStr: string, offset: { year?: number; month?: number }) {
  const d = dayjs(dateStr);
  let result = d;
  if (offset.year) {
    result = result.add(offset.year, 'year');
  }
  if (offset.month) {
    result = result.add(offset.month, 'month');
  }
  return result.format('YYYY-MM-DD');
}

function buildCompareTrendSeries(
  currentRows: Activity[],
  lastMonthRows: Activity[],
  lastYearRows: Activity[]
): CompareTrendSeries[] {
  const groupByDate = (rows: Activity[]) => {
    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.recordDate] = (acc[row.recordDate] || 0) + Number(row.carbonValue);
      return acc;
    }, {});
  };

  const currentGrouped = groupByDate(currentRows);
  const lastMonthGrouped = groupByDate(lastMonthRows);
  const lastYearGrouped = groupByDate(lastYearRows);

  const allDates = new Set<string>([
    ...Object.keys(currentGrouped),
    ...Object.keys(lastMonthGrouped).map((d) => normalizeDateToCurrentMonth(d, { month: 1 })),
    ...Object.keys(lastYearGrouped).map((d) => normalizeDateToCurrentMonth(d, { year: 1 }))
  ]);

  const sortedDates = Array.from(allDates).sort();

  const toFixedNum = (n: number) => Number(n.toFixed(2));

  return [
    {
      name: '本月',
      key: 'current',
      data: sortedDates.map((date) => ({
        date,
        value: toFixedNum(currentGrouped[date] || 0)
      }))
    },
    {
      name: '上月',
      key: 'lastMonth',
      data: sortedDates.map((date) => {
        const originalDate = normalizeDateToCurrentMonth(date, { month: -1 });
        return { date, value: toFixedNum(lastMonthGrouped[originalDate] || 0) };
      })
    },
    {
      name: '去年同期',
      key: 'lastYear',
      data: sortedDates.map((date) => {
        const originalDate = normalizeDateToCurrentMonth(date, { year: -1 });
        return { date, value: toFixedNum(lastYearGrouped[originalDate] || 0) };
      })
    }
  ];
}

function calcComparison(current: number, compare: number): ComparisonResult {
  const diff = Number((current - compare).toFixed(2));
  const diffPercent = compare === 0 ? 0 : Number(((diff / compare) * 100).toFixed(2));
  const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  return { current, compare, diff, diffPercent, trend };
}

export function useCarbonStats(
  rows: Activity[],
  lastMonthRows: Activity[] = [],
  lastYearRows: Activity[] = []
): CarbonStatsResult {
  return useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    const weekStart = dayjs().startOf('week');
    const monthStart = dayjs().startOf('month');
    const monthEnd = dayjs().endOf('month');

    const todayTotal = rows
      .filter((row) => row.recordDate === today)
      .reduce((sum, row) => sum + Number(row.carbonValue), 0);

    const weekTotal = rows
      .filter((row) => dayjs(row.recordDate).isAfter(weekStart.subtract(1, 'day')))
      .reduce((sum, row) => sum + Number(row.carbonValue), 0);

    const monthTotal = rows
      .filter((row) => dayjs(row.recordDate).isAfter(monthStart.subtract(1, 'day')))
      .reduce((sum, row) => sum + Number(row.carbonValue), 0);

    const trend: TrendPoint[] = rows
      .slice()
      .sort((a, b) => a.recordDate.localeCompare(b.recordDate))
      .map((row) => ({ date: row.recordDate, value: Number(row.carbonValue), category: row.category }));

    const lastMonthTotal = sumInRange(lastMonthRows, monthStart.subtract(1, 'month'), monthEnd.subtract(1, 'month'));
    const lastYearTotal = sumInRange(lastYearRows, monthStart.subtract(1, 'year'), monthEnd.subtract(1, 'year'));

    const lastMonthComparison = calcComparison(Number(monthTotal.toFixed(2)), Number(lastMonthTotal.toFixed(2)));
    const lastYearComparison = calcComparison(Number(monthTotal.toFixed(2)), Number(lastYearTotal.toFixed(2)));

    const compareTrendSeries = buildCompareTrendSeries(rows, lastMonthRows, lastYearRows);

    return {
      todayTotal: Number(todayTotal.toFixed(2)),
      weekTotal: Number(weekTotal.toFixed(2)),
      monthTotal: Number(monthTotal.toFixed(2)),
      trend,
      lastMonthComparison,
      lastYearComparison,
      compareTrendSeries
    };
  }, [rows, lastMonthRows, lastYearRows]);
}
