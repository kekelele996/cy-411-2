import { useEffect } from 'react';
import { ArrowDownOutlined, ArrowUpOutlined, MinusOutlined } from '@ant-design/icons';
import { Card, Col, Row, Space, Statistic, Typography } from 'antd';
import { CarbonTrendChart } from '../components/common/CarbonTrendChart';
import { GoalProgressCard } from '../components/common/GoalProgressCard';
import { EmptyState } from '../components/common/EmptyState';
import { useActivityStore } from '../stores/activityStore';
import { useGoalStore } from '../stores/goalStore';
import { useCarbonStats, ComparisonResult } from '../hooks/useCarbonStats';
import { useAuth } from '../hooks/useAuth';
import { getLastMonthRange, getMonthRange, getSameMonthLastYearRange } from '../utils/dateRange';
import { formatCarbon } from '../utils/formatters';

function renderTrendIcon(trend: ComparisonResult['trend']) {
  if (trend === 'up') {
    return <ArrowUpOutlined style={{ color: '#c84f31' }} />;
  }
  if (trend === 'down') {
    return <ArrowDownOutlined style={{ color: '#2f7d59' }} />;
  }
  return <MinusOutlined style={{ color: '#999' }} />;
}

function getTrendColor(trend: ComparisonResult['trend']) {
  if (trend === 'up') return '#c84f31';
  if (trend === 'down') return '#2f7d59';
  return '#999';
}

function CompareStatCard({
  title,
  comparison,
  compareLabel
}: {
  title: string;
  comparison: ComparisonResult;
  compareLabel: string;
}) {
  const trendColor = getTrendColor(comparison.trend);
  return (
    <Card>
      <Statistic
        title={title}
        value={formatCarbon(comparison.current)}
        valueStyle={{ fontSize: 20, fontWeight: 600 }}
      />
      <Space direction="vertical" size={4} style={{ marginTop: 12, width: '100%' }}>
        <div className="muted" style={{ fontSize: 12 }}>
          {compareLabel}：{formatCarbon(comparison.compare)}
        </div>
        <Space size={8} style={{ fontSize: 13 }}>
          {renderTrendIcon(comparison.trend)}
          <span style={{ color: trendColor, fontWeight: 500 }}>
            {comparison.trend === 'flat' ? '持平' : `${comparison.diff > 0 ? '+' : ''}${comparison.diff.toFixed(2)} kg CO2e`}
          </span>
          <span style={{ color: trendColor, fontWeight: 500 }}>
            ({comparison.trend === 'flat' ? '0.00' : `${comparison.diffPercent > 0 ? '+' : ''}${comparison.diffPercent.toFixed(2)}`}%)
          </span>
        </Space>
      </Space>
    </Card>
  );
}

export function Dashboard() {
  const rows = useActivityStore((state) => state.rows);
  const rowsByPeriod = useActivityStore((state) => state.rowsByPeriod);
  const loadPeriod = useActivityStore((state) => state.loadPeriod);
  const goals = useGoalStore((state) => state.goals);
  const loadGoals = useGoalStore((state) => state.load);
  const { token } = useAuth();
  const stats = useCarbonStats(rowsByPeriod.current, rowsByPeriod.lastMonth, rowsByPeriod.lastYear);

  useEffect(() => {
    if (!token) return;
    const monthRange = getMonthRange();
    const lastMonthRange = getLastMonthRange();
    const sameMonthLastYearRange = getSameMonthLastYearRange();
    void loadPeriod('current', { start: monthRange[0], end: monthRange[1] });
    void loadPeriod('lastMonth', { start: lastMonthRange[0], end: lastMonthRange[1] });
    void loadPeriod('lastYear', { start: sameMonthLastYearRange[0], end: sameMonthLastYearRange[1] });
    void loadGoals();
  }, [loadPeriod, loadGoals, token]);

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2}>CarbonTrack 工作台</Typography.Title>
        <Typography.Text type="secondary">今日、周期和目标进度集中在一个视图中。</Typography.Text>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}><Card><Statistic title="今日排放" value={formatCarbon(stats.todayTotal)} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="本周排放" value={formatCarbon(stats.weekTotal)} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="本月排放" value={formatCarbon(stats.monthTotal)} /></Card></Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <CompareStatCard
            title="本月 vs 上月"
            comparison={stats.lastMonthComparison}
            compareLabel="上月排放"
          />
        </Col>
        <Col xs={24} md={12}>
          <CompareStatCard
            title="本月 vs 去年同期"
            comparison={stats.lastYearComparison}
            compareLabel="去年同期排放"
          />
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <Card title="碳排趋势">
            <CarbonTrendChart compareSeries={stats.compareTrendSeries} data={stats.trend} />
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Card title="目标进度">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {goals.length ? goals.slice(0, 3).map((goal) => <GoalProgressCard key={goal.id} goal={goal} />) : <EmptyState text="还没有减排目标" />}
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
