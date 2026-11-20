import useFloodStore from '../store/floodStore';
import { formatIndian, formatINR, formatPercent } from '../utils/formatters';
import { getSeverityBadge } from '../utils/colorScale';

export default function ResourcesPage() {
  const { selectedState, resourceData, loading } = useFloodStore();

  if (loading.resources || loading.dashboard) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-16 rounded-lg" />
        <div className="grid grid-cols-5 gap-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
        <div className="skeleton h-[400px] rounded-xl" />
      </div>
    );
  }

  const pool = resourceData?.total_pool || {};
  const plan = resourceData?.allocation_plan || [];
  const coverage = resourceData?.coverage_pct || 0;
  const unmet = resourceData?.unmet_districts || [];
  const totalCost = resourceData?.total_cost_inr || 0;

  // Compute deployed totals
  const deployed = {};
  const required = {};
  for (const p of plan) {
    for (const [k, v] of Object.entries(p.allocated_from_pool || {})) {
      deployed[k] = (deployed[k] || 0) + v;
    }
    for (const [k, v] of Object.entries(p.required || {})) {
      required[k] = (required[k] || 0) + v;
    }
  }

  const resources = [
    { key: 'rescue_teams', label: 'Rescue Teams', icon: '🚑' },
    { key: 'boats', label: 'Boats', icon: '🚤' },
    { key: 'medical_units', label: 'Medical Units', icon: '🏥' },
    { key: 'helicopters', label: 'Helicopters', icon: '🚁' },
    { key: 'relief_camps', label: 'Relief Camps', icon: '⛺' },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="page-header rounded-lg">
        <h1>📦 Resource Allocation — {selectedState}</h1>
        <span className="text-sm text-white/80">{plan.length} districts</span>
      </div>

      {/* Resource Pool Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {resources.map(r => {
          const total = pool[r.key] || 1;
          const used = deployed[r.key] || 0;
          const req = required[r.key] || 0;
          const pct = Math.min(100, (used / total) * 100);
          const color = pct >= 80 ? '#dc2626' : pct >= 50 ? '#ea580c' : '#16a34a';
          return (
            <div key={r.key} className="bg-white rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{r.icon}</span>
                <span className="text-xs font-semibold text-gov-navy">{r.label}</span>
              </div>
              <div className="text-lg font-bold font-[family-name:var(--font-data)]" style={{ color }}>
                {used} / {total}
              </div>
              <div className="text-[10px] text-text-muted mb-2">Required: {req}</div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Allocation Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-bold text-gov-navy">District Allocation Plan</h3>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="gov-table">
            <thead className="sticky top-0 z-10">
              <tr>
                <th>#</th>
                <th>District</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Teams</th>
                <th>Gap %</th>
                <th>ETA (hrs)</th>
                <th>Distance</th>
                <th>Dispatch From</th>
                <th>Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {plan.map((p, i) => {
                const badge = getSeverityBadge(p.predicted_severity);
                const statusColor = p.status === 'DISPATCH_READY' ? '#16a34a' : p.status === 'PARTIAL' ? '#ca8a04' : '#dc2626';
                return (
                  <tr key={p.district}>
                    <td className="font-[family-name:var(--font-data)] text-text-muted">{p.priority_rank}</td>
                    <td className="font-medium">{p.district}</td>
                    <td>
                      <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: badge.bg, color: badge.text, border: `1px solid ${badge.border}` }}>
                        {p.predicted_severity?.toFixed(1)}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-bold" style={{ color: statusColor }}>{p.status}</span>
                    </td>
                    <td className="font-[family-name:var(--font-data)]">
                      {p.allocated_from_pool?.rescue_teams || 0}
                    </td>
                    <td className="font-[family-name:var(--font-data)]">{p.resource_gap_pct}%</td>
                    <td className="font-[family-name:var(--font-data)]">{p.dispatch_eta_hrs}</td>
                    <td className="font-[family-name:var(--font-data)]">{p.dispatch_distance_km} km</td>
                    <td className="text-xs">{p.dispatch_from}</td>
                    <td className="font-[family-name:var(--font-data)]">{formatINR(p.estimated_cost_inr)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-text-muted font-semibold uppercase mb-1">Total Deployment Cost</div>
            <div className="text-2xl font-bold text-accent-primary font-[family-name:var(--font-data)]">{formatINR(totalCost)}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted font-semibold uppercase mb-1">Population Coverage</div>
            <div className="text-2xl font-bold font-[family-name:var(--font-data)]" style={{ color: coverage > 80 ? '#16a34a' : coverage > 50 ? '#ca8a04' : '#dc2626' }}>
              {formatPercent(coverage)}
            </div>
            <div className="text-xs text-text-muted">{plan.length - unmet.length} districts fully covered</div>
          </div>
          <div>
            <div className="text-xs text-text-muted font-semibold uppercase mb-1">Unmet Districts</div>
            <div className="text-2xl font-bold text-severity-high font-[family-name:var(--font-data)]">{unmet.length}</div>
            {unmet.length > 0 && (
              <div className="text-[11px] text-text-muted mt-1">{unmet.slice(0, 5).join(', ')}{unmet.length > 5 ? '...' : ''}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
