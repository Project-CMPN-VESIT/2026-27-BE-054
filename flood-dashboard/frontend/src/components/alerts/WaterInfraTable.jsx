export default function WaterInfraTable({ data }) {
  const features = data?.features || [];
  const sourceLabel = data?.source === 'static_reference_db'
    ? '⚠ Reference data — Live OSM data unavailable in this environment'
    : '● Live — OpenStreetMap Overpass API';
  const sourceLabelColor = data?.source === 'static_reference_db'
    ? '#92400e'
    : '#14532d';

  return (
    <div>
      <div className="mb-2 text-xs font-semibold" style={{ color: sourceLabelColor }}>
        {sourceLabel}
      </div>
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wide text-slate-500">Name</th>
              <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wide text-slate-500">Type</th>
              <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wide text-slate-500">Distance from center</th>
              <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wide text-slate-500">Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {features.map((item, idx) => (
              <tr key={`${item.name}-${idx}`} className="border-t border-slate-100 hover:bg-slate-50/70">
                <td className="px-3 py-2 text-slate-800">{item.name}</td>
                <td className="px-3 py-2 text-slate-700">{item.type}</td>
                <td className="px-3 py-2 font-medium text-slate-700">{item.distance_from_center_km} km</td>
                <td className="px-3 py-2">
                  <span className={`status-badge ${item.risk_level === 'HIGH' ? 'badge-critical' : item.risk_level === 'MEDIUM' ? 'badge-high' : 'badge-medium'}`}>
                    {item.risk_level}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
