function getStatus(gap, req) {
  const pct = req > 0 ? (gap / req) * 100 : 0;
  if (pct > 60) return 'CRITICAL';
  if (pct > 30) return 'HIGH';
  if (pct > 0) return 'MEDIUM';
  return 'OK';
}

function getSummaryBackground(gapPct) {
  if (gapPct > 60) return '#fef2f2';
  if (gapPct > 30) return '#fff7ed';
  if (gapPct > 0) return '#fffbeb';
  return '#f0fdf4';
}

const RESOURCE_LABELS = [
  ['rescue_teams', 'Rescue Teams'],
  ['boats', 'Boats'],
  ['medical_units', 'Medical Units'],
  ['helicopters', 'Helicopters'],
  ['relief_camps', 'Relief Camps'],
];

export default function ResourceRequirementTable({ required = {}, available = {}, gapPct = 0 }) {
  let totalShort = 0;
  const rows = RESOURCE_LABELS.map(([key, label]) => {
    const req = required[key] || 0;
    const avail = available[key] || 0;
    const gap = Math.max(0, req - avail);
    const gapPercent = req > 0 ? Math.round((gap / req) * 100) : 0;
    const status = getStatus(gap, req);
    totalShort += gap;
    return { label, req, avail, gap, gapPercent, status };
  });

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wide text-slate-500">Resource Type</th>
            <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wide text-slate-500">Required</th>
            <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wide text-slate-500">Available</th>
            <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wide text-slate-500">Gap</th>
            <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wide text-slate-500">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={`border-t border-slate-100 ${row.status === 'CRITICAL' ? 'status-critical' : row.status === 'HIGH' ? 'status-high' : row.status === 'MEDIUM' ? 'status-medium' : 'status-ok'}`}>
              <td className="px-3 py-2 font-medium text-slate-800">{row.label}</td>
              <td className="px-3 py-2">{row.req}</td>
              <td className="px-3 py-2">{row.avail}</td>
              <td className="px-3 py-2 font-semibold">{row.gap} ({row.gapPercent}%)</td>
              <td className="px-3 py-2">
                <span className={`status-badge ${row.status === 'CRITICAL' ? 'badge-critical' : row.status === 'HIGH' ? 'badge-high' : row.status === 'MEDIUM' ? 'badge-medium' : 'badge-ok'}`}>
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
          <tr style={{ background: getSummaryBackground(gapPct) }} className="border-t border-slate-200 overall-status-row">
            <td colSpan={5} className="px-3 py-2 font-semibold text-slate-800">
              Overall Status: {gapPct.toFixed(1)}% gap — {totalShort} resources short
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
