import { useMemo, useState } from 'react';
import useFloodStore from '../store/floodStore';
import FloodMap from '../components/map/FloodMap';
import PriorityPanel from '../components/panels/PriorityPanel';
import ResourcePanel from '../components/panels/ResourcePanel';
import AlertsPanel from '../components/panels/AlertsPanel';
import { formatIndian, formatINR, formatPercent } from '../utils/formatters';
import AlertDetailModal from '../components/alerts/AlertDetailModal';

export default function DashboardPage() {
  const { stateSummary, districts, alertsData, resourceData, loading, selectedState, selectDistrict } = useFloodStore();
  const [selectedAlert, setSelectedAlert] = useState(null);

  const s = stateSummary || {};
  const totalCost = resourceData?.total_cost_inr || 0;
  const displayCost = totalCost >= 10000000
    ? `₹${(totalCost / 10000000).toFixed(2)} Cr`
    : `₹${totalCost.toLocaleString('en-IN')}`;
  const alertCount = alertsData?.alert_count || 0;
  const affectedPct = s.total_population ? ((s.total_affected_population / s.total_population) * 100).toFixed(1) : 0;
  const avgGap = districts?.length
    ? (districts.reduce((acc, d) => acc + (d.resource_gap_score || 0), 0) / districts.length * 100).toFixed(1)
    : 0;

  const kpis = useMemo(() => [
    { label: 'Total Population', value: formatIndian(s.total_population), icon: '👥', color: '#1a56db' },
    { label: 'Potentially Affected (Modeled)', value: formatIndian(s.total_affected_population), sub: `${affectedPct}%`, icon: '⚠️', color: '#ea580c' },
    { label: 'Critical Districts', value: s.high_risk_count || 0, icon: '🔴', color: '#dc2626' },
    { label: 'Avg Resource Gap', value: `${avgGap}%`, icon: '📦', color: '#ca8a04' },
    { label: 'Est. Cost', value: displayCost, icon: '💰', color: '#0369a1' },
    { label: 'Active Alerts', value: alertCount, icon: '🚨', color: alertCount > 5 ? '#dc2626' : '#16a34a' },
  ], [s, affectedPct, avgGap, displayCost, alertCount]);

  if (loading.dashboard) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
        <div className="skeleton h-[400px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* KPI Strip */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 p-4 border-b border-border bg-white">
        {kpis.map(kpi => (
          <div key={kpi.label} className="kpi-card">
            <div className="text-lg mb-1">{kpi.icon}</div>
            <div className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">{kpi.label}</div>
            <div
              className={`kpi-card-value ${String(kpi.value).length > 8 ? 'long-value' : ''} font-[family-name:var(--font-data)]`}
              style={{ color: kpi.color }}
            >
              {kpi.value}
            </div>
            {kpi.sub && <div className="text-[10px] text-text-muted">{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {!!alertsData?.alerts?.length && (
        <div className="px-4 py-2 border-b border-border bg-white">
          <div className="text-xs font-bold text-gov-navy uppercase mb-2">Alert Strip</div>
          <div className="flex flex-wrap gap-2">
            {alertsData.alerts.slice(0, 3).map((alert, idx) => (
              <div key={`${alert.district}-${idx}`} className="text-xs border border-border rounded-lg px-2 py-1 flex items-center gap-2">
                <span>{alert.level}</span>
                <span>{alert.district}</span>
                <button
                  className="text-accent-primary font-semibold"
                  onClick={() => {
                    const districtData = districts.find((d) => d.district === alert.district);
                    if (districtData) selectDistrict(districtData);
                    setSelectedAlert({ district: alert.district, state: alert.state || selectedState });
                  }}
                >
                  VIEW →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map + Side Panels */}
      <div className="flex-1 flex overflow-hidden">
        <FloodMap />
        <div className="w-64 xl:w-72 bg-white border-l border-border overflow-y-auto shrink-0 hidden lg:block">
          <PriorityPanel />
          <div className="border-t border-border" />
          <ResourcePanel />
        </div>
      </div>

      {/* Bottom Alerts */}
      <AlertsPanel />
      {selectedAlert && (
        <AlertDetailModal
          district={selectedAlert.district}
          state={selectedAlert.state}
          onClose={() => setSelectedAlert(null)}
        />
      )}
    </div>
  );
}
