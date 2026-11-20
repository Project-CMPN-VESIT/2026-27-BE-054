import { useState } from 'react';
import useFloodStore from '../../store/floodStore';
import { getAlertLevelColor } from '../../utils/colorScale';
import AlertDetailModal from '../alerts/AlertDetailModal';

export default function AlertsPanel() {
  const { alertsData, loading, selectDistrict, districts, selectedState } = useFloodStore();
  const [expanded, setExpanded] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);

  if (loading.alerts || loading.dashboard) {
    return (
      <div className="border-t border-border bg-white p-3">
        <div className="text-xs font-bold text-text-muted">⚠️ LOADING ALERTS...</div>
        <div className="mt-2 space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-14 rounded" />)}</div>
      </div>
    );
  }

  const alerts = alertsData?.alerts || [];
  const displayed = expanded ? alerts.slice(0, 8) : alerts.slice(0, 2);

  const handleViewOnMap = (alert) => {
    const d = districts.find(dd => dd.district === alert.district);
    if (d) selectDistrict(d);
    setSelectedAlert({ district: alert.district, state: alert.state || selectedState });
  };

  return (
    <div className="border-t border-border bg-white shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs">⚠️</span>
          <span className="text-xs font-bold text-gov-navy uppercase tracking-wider">
            Active Alerts ({alerts.length})
          </span>
          {alertsData?.critical_count > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded badge-critical">
              {alertsData.critical_count} CRITICAL
            </span>
          )}
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-accent-primary hover:text-accent-secondary transition-colors cursor-pointer">
          {expanded ? '▼ Collapse' : '▲ Expand'}
        </button>
      </div>

      {/* Alert list */}
      <div className={`overflow-y-auto transition-all duration-300 ${expanded ? 'max-h-52' : 'max-h-28'}`}>
        {displayed.length === 0 ? (
          <div className="p-4 text-center text-xs text-text-muted">No active alerts for this state</div>
        ) : (
          displayed.map((alert, i) => {
            const color = getAlertLevelColor(alert.level);
            return (
              <div key={alert.id || i} className="flex items-start gap-3 px-4 py-2 border-b border-border/30 hover:bg-bg-card-hover transition-colors animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="w-1 self-stretch rounded-full shrink-0 mt-0.5" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${color}15`, color, border: `1px solid ${color}40` }}>
                      {alert.level}
                    </span>
                    <span className="text-[10px] text-text-muted font-[family-name:var(--font-data)]">
                      {alert.district}, {alert.state}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-text-primary mb-0.5 truncate">{alert.title}</div>
                  <div className="text-[11px] text-text-muted line-clamp-1">{alert.message}</div>
                </div>
                <button onClick={() => handleViewOnMap(alert)} className="text-[10px] text-accent-primary hover:text-accent-secondary transition-colors whitespace-nowrap cursor-pointer shrink-0">
                  VIEW →
                </button>
              </div>
            );
          })
        )}
      </div>
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
