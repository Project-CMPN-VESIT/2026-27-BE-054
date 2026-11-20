import useFloodStore from '../../store/floodStore';
import { getSeverityColor, getSeverityEmoji } from '../../utils/colorScale';
import { formatPopulation } from '../../utils/formatters';

export default function PriorityPanel() {
  const { priorityData, loading, selectDistrict, districts } = useFloodStore();

  if (loading.priority || loading.dashboard) {
    return (
      <div className="p-3 space-y-2">
        <div className="text-xs font-bold text-gov-navy uppercase tracking-wider">Priority Ranking</div>
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-10 rounded" />)}
      </div>
    );
  }

  const ranked = priorityData?.ranked_districts || [];

  const handleClick = (rankingName) => {
    // Find ALL matching districts (in case of name duplicates)
    const matches = districts.filter(d => 
      d.district.trim().toUpperCase() === rankingName.trim().toUpperCase()
    );
    
    if (matches.length === 0) {
      console.warn(`District "${rankingName}" not found`);
      return;
    }
    
    // Pick the best match: highest population (most relevant)
    const bestMatch = matches.reduce((prev, current) => 
      (prev.population > current.population) ? prev : current
    );
    
    // Validate coordinates before selecting
    if (!bestMatch.latitude || !bestMatch.longitude || 
        Math.abs(bestMatch.longitude) > 180 || Math.abs(bestMatch.latitude) > 90) {
      console.warn(`Invalid coordinates for ${rankingName}: (${bestMatch.latitude}, ${bestMatch.longitude})`);
      return;
    }
    
    selectDistrict(bestMatch);
  };

  const emergencyColor = {
    RED: '#dc2626', ORANGE: '#ea580c', YELLOW: '#ca8a04', GREEN: '#16a34a',
  };

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold text-gov-navy uppercase tracking-wider">Priority Ranking</div>
        {priorityData?.state_emergency_level && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded"
            style={{
              color: emergencyColor[priorityData.state_emergency_level] || '#64748b',
              background: (emergencyColor[priorityData.state_emergency_level] || '#64748b') + '15',
              border: `1px solid ${(emergencyColor[priorityData.state_emergency_level] || '#64748b')}40`,
            }}>
            {priorityData.state_emergency_level}
          </span>
        )}
      </div>

      <div className="overflow-y-auto max-h-[280px] space-y-0.5">
        {ranked.slice(0, 15).map((r) => {
          const color = getSeverityColor(r.predicted_severity);
          return (
            <button
              key={r.district}
              onClick={() => handleClick(r.district)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-card-hover transition-colors cursor-pointer text-left"
            >
              <span className="text-[10px] font-bold text-text-muted w-4 font-[family-name:var(--font-data)]">{r.rank}</span>
              <span className="text-xs">{getSeverityEmoji(r.predicted_severity)}</span>
              <span className="text-xs font-medium text-text-primary flex-1 truncate">{r.district}</span>
              <span className="text-[11px] font-bold font-[family-name:var(--font-data)]" style={{ color }}>
                {r.priority_score?.toFixed(0)}
              </span>
              <span className="text-[10px] text-text-muted w-10 text-right">{formatPopulation(r.population)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
