import useFloodStore from '../../store/floodStore';
import { formatINR, formatPercent } from '../../utils/formatters';

export default function ResourcePanel() {
  const { resourceData, loading } = useFloodStore();

  if (loading.resources || loading.dashboard) {
    return (
      <div className="p-3 space-y-2">
        <div className="text-xs font-bold text-gov-navy uppercase tracking-wider">Resource Status</div>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-8 rounded" />)}
      </div>
    );
  }

  const pool = resourceData?.total_pool || {};
  const plan = resourceData?.allocation_plan || [];
  const coverage = resourceData?.coverage_pct || 0;
  const unmet = resourceData?.unmet_districts || [];
  const totalCost = resourceData?.total_cost_inr || 0;

  const deployed = {};
  for (const p of plan) {
    for (const [k, v] of Object.entries(p.allocated_from_pool || {})) {
      deployed[k] = (deployed[k] || 0) + v;
    }
  }

  const resources = [
    { key: 'rescue_teams', label: 'Rescue Teams', icon: '🚑' },
    { key: 'boats', label: 'Boats', icon: '🚤' },
    { key: 'medical_units', label: 'Medical Units', icon: '🏥' },
    { key: 'helicopters', label: 'Helicopters', icon: '🚁' },
  ];

  return (
    <div className="p-3">
      <div className="text-xs font-bold text-gov-navy uppercase tracking-wider mb-2">Resource Status</div>

      <div className="space-y-2 mb-3">
        {resources.map(r => {
          const total = pool[r.key] || 1;
          const used = deployed[r.key] || 0;
          const pct = Math.min(100, (used / total) * 100);
          return (
            <div key={r.key}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-text-muted">{r.icon} {r.label}</span>
                <span className="font-[family-name:var(--font-data)] font-medium text-text-primary">
                  {used} / {total}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: pct > 80 ? '#dc2626' : pct > 50 ? '#ea580c' : '#1a56db',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-bg-primary rounded-lg p-2 space-y-1 text-xs border border-border">
        <div className="flex justify-between">
          <span className="text-text-muted">Coverage</span>
          <span className="font-bold font-[family-name:var(--font-data)]" style={{ color: coverage > 80 ? '#16a34a' : coverage > 50 ? '#ca8a04' : '#dc2626' }}>
            {formatPercent(coverage)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Est. Cost</span>
          <span className="font-bold text-accent-primary font-[family-name:var(--font-data)]">{formatINR(totalCost)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Unmet Districts</span>
          <span className="font-bold text-severity-high font-[family-name:var(--font-data)]">{unmet.length}</span>
        </div>
      </div>
    </div>
  );
}
