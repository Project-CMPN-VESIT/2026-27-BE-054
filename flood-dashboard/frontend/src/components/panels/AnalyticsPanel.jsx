import useFloodStore from '../../store/floodStore';
import { formatPopulation, formatINR, formatPercent } from '../../utils/formatters';
import SeverityDistribution from '../charts/SeverityDistribution';
import RainfallTrend from '../charts/RainfallTrend';
import ResourceGapChart from '../charts/ResourceGapChart';

export default function AnalyticsPanel() {
  const { stateSummary, districts, alertsData, resourceData, loading } = useFloodStore();

  if (loading.districts) {
    return (
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-lg" />)}
        </div>
      </div>
    );
  }

  const s = stateSummary || {};
  const totalCost = resourceData?.total_cost_inr || 0;
  const alertCount = alertsData?.alert_count || 0;
  const affectedPct = s.total_population ? ((s.total_affected_population / s.total_population) * 100).toFixed(1) : 0;
  const avgGap = districts?.length ? (districts.reduce((acc, d) => acc + (d.resource_gap_score || 0), 0) / districts.length * 100).toFixed(1) : 0;

  const kpis = [
    { label: 'TOTAL POP.', value: formatPopulation(s.total_population), sub: 'at risk', color: '#00d4ff' },
    { label: 'AFFECTED', value: formatPopulation(s.total_affected_population), sub: `${affectedPct}%`, color: '#FF6B00' },
    { label: 'CRITICAL', value: s.high_risk_count || 0, sub: 'districts', color: '#FF1744' },
    { label: 'RESOURCE GAP', value: `${avgGap}%`, sub: 'avg deficit', color: '#FFA500' },
    { label: 'COST EST.', value: formatINR(totalCost), sub: 'deployment', color: '#3b82f6' },
    { label: 'ALERTS', value: alertCount, sub: 'active', color: alertCount > 5 ? '#FF1744' : '#00E676' },
  ];

  return (
    <div className="p-3 border-t border-border bg-bg-secondary overflow-y-auto shrink-0">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="glass rounded-lg p-2 text-center">
            <div className="text-[10px] text-text-muted font-[family-name:var(--font-display)] mb-0.5">{kpi.label}</div>
            <div className="text-base font-bold font-[family-name:var(--font-data)]" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-[10px] text-text-muted">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="glass rounded-lg p-3">
          <div className="text-[10px] font-bold text-text-muted font-[family-name:var(--font-display)] mb-2">SEVERITY DISTRIBUTION</div>
          <SeverityDistribution districts={districts || []} />
        </div>
        <div className="glass rounded-lg p-3">
          <div className="text-[10px] font-bold text-text-muted font-[family-name:var(--font-display)] mb-2">RAINFALL vs HISTORICAL</div>
          <RainfallTrend districts={districts || []} />
        </div>
        <div className="glass rounded-lg p-3">
          <div className="text-[10px] font-bold text-text-muted font-[family-name:var(--font-display)] mb-2">TOP RESOURCE GAPS</div>
          <ResourceGapChart districts={districts || []} />
        </div>
      </div>
    </div>
  );
}
