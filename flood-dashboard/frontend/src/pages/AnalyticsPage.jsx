import { useState, useMemo } from 'react';
import useFloodStore from '../store/floodStore';
import { formatIndian, formatINR, formatPercent } from '../utils/formatters';
import { getSeverityColor, getSeverityBadge } from '../utils/colorScale';
import SeverityDistribution from '../components/charts/SeverityDistribution';
import RainfallTrend from '../components/charts/RainfallTrend';
import ResourceGapChart from '../components/charts/ResourceGapChart';
import { Download, Search, ArrowUpDown } from 'lucide-react';

export default function AnalyticsPage() {
  const { selectedState, stateSummary, districts, alertsData, resourceData } = useFloodStore();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('severity_score');
  const [sortDir, setSortDir] = useState('desc');

  const s = stateSummary || {};
  const totalCost = resourceData?.total_cost_inr || 0;
  const alertCount = alertsData?.alert_count || 0;
  const affectedPct = s.total_population ? ((s.total_affected_population / s.total_population) * 100).toFixed(1) : 0;

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortArrow = (key) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  const filteredSorted = useMemo(() => {
    let list = [...(districts || [])];
    if (search) list = list.filter(d => d.district?.toLowerCase().includes(search.toLowerCase()));
    list.sort((a, b) => {
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return list;
  }, [districts, search, sortKey, sortDir]);

  const exportCSV = () => {
    const headers = ['District', 'Severity', 'Population', 'Affected', 'Resource Gap', 'Flood Freq', 'Monsoon Rain'];
    const rows = filteredSorted.map(d => [
      d.district, d.severity_score?.toFixed(2), d.population, d.impact_population,
      (d.resource_gap_score * 100).toFixed(1) + '%', d.flood_freq_per_year?.toFixed(3),
      d.monsoon_rain_mm?.toFixed(0),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedState}_analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="page-header rounded-lg">
        <h1>📊 Analytics — {selectedState}</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="kpi-card"><div className="text-[10px] text-text-muted font-semibold uppercase">Total Pop.</div><div className="text-lg font-bold text-accent-primary font-[family-name:var(--font-data)]">{formatIndian(s.total_population)}</div></div>
        <div className="kpi-card"><div className="text-[10px] text-text-muted font-semibold uppercase">Affected</div><div className="text-lg font-bold text-severity-high font-[family-name:var(--font-data)]">{formatIndian(s.total_affected_population)}</div><div className="text-[10px] text-text-muted">{affectedPct}%</div></div>
        <div className="kpi-card"><div className="text-[10px] text-text-muted font-semibold uppercase">Critical</div><div className="text-lg font-bold text-severity-critical font-[family-name:var(--font-data)]">{s.high_risk_count || 0}</div></div>
        <div className="kpi-card"><div className="text-[10px] text-text-muted font-semibold uppercase">Avg Severity</div><div className="text-lg font-bold font-[family-name:var(--font-data)]" style={{ color: getSeverityColor(s.avg_severity_score) }}>{s.avg_severity_score || 0}</div></div>
        <div className="kpi-card"><div className="text-[10px] text-text-muted font-semibold uppercase">Est. Cost</div><div className="text-lg font-bold text-accent-secondary font-[family-name:var(--font-data)]">{formatINR(totalCost)}</div></div>
        <div className="kpi-card"><div className="text-[10px] text-text-muted font-semibold uppercase">Alerts</div><div className="text-lg font-bold font-[family-name:var(--font-data)]" style={{ color: alertCount > 5 ? '#dc2626' : '#16a34a' }}>{alertCount}</div></div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="text-xs font-bold text-gov-navy mb-3 uppercase tracking-wider">Severity Distribution</div>
          <SeverityDistribution districts={districts || []} />
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="text-xs font-bold text-gov-navy mb-3 uppercase tracking-wider">Rainfall vs Historical</div>
          <RainfallTrend districts={districts || []} />
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="text-xs font-bold text-gov-navy mb-3 uppercase tracking-wider">Top Resource Gaps</div>
          <ResourceGapChart districts={districts || []} />
        </div>
      </div>

      {/* District Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-sm font-bold text-gov-navy">All Districts ({filteredSorted.length})</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-text-muted" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Filter districts..."
                className="pl-8 pr-3 py-2 text-xs border border-border rounded-lg outline-none focus:border-accent-primary transition-colors w-48"
              />
            </div>
            <button onClick={exportCSV} className="btn-secondary flex items-center gap-1.5 text-xs">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="gov-table">
            <thead className="sticky top-0 z-10">
              <tr>
                <th onClick={() => handleSort('district')}>District{sortArrow('district')}</th>
                <th onClick={() => handleSort('severity_score')}>Severity{sortArrow('severity_score')}</th>
                <th onClick={() => handleSort('population')}>Population{sortArrow('population')}</th>
                <th onClick={() => handleSort('impact_population')}>Affected{sortArrow('impact_population')}</th>
                <th onClick={() => handleSort('resource_gap_score')}>Gap %{sortArrow('resource_gap_score')}</th>
                <th onClick={() => handleSort('flood_freq_per_year')}>Flood Freq{sortArrow('flood_freq_per_year')}</th>
                <th onClick={() => handleSort('monsoon_rain_mm')}>Monsoon Rain{sortArrow('monsoon_rain_mm')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSorted.map(d => {
                const badge = getSeverityBadge(d.severity_score);
                return (
                  <tr key={d.district}>
                    <td className="font-medium">{d.district}</td>
                    <td>
                      <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: badge.bg, color: badge.text, border: `1px solid ${badge.border}` }}>
                        {d.severity_score?.toFixed(1)} — {badge.label}
                      </span>
                    </td>
                    <td className="font-[family-name:var(--font-data)]">{formatIndian(d.population)}</td>
                    <td className="font-[family-name:var(--font-data)]">{formatIndian(d.impact_population)}</td>
                    <td className="font-[family-name:var(--font-data)]">{formatPercent(d.resource_gap_score * 100)}</td>
                    <td className="font-[family-name:var(--font-data)]">{d.flood_freq_per_year?.toFixed(3)}</td>
                    <td className="font-[family-name:var(--font-data)]">{d.monsoon_rain_mm?.toFixed(0)} mm</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
