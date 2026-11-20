import { useState, useMemo } from 'react';
import useFloodStore from '../store/floodStore';
import { getAlertLevelColor } from '../utils/colorScale';
import { timeAgo } from '../utils/formatters';
import { Bell, Check, Filter } from 'lucide-react';
import AlertDetailModal from '../components/alerts/AlertDetailModal';

export default function AlertsPage() {
  const { selectedState, alertsData, districts, selectDistrict } = useFloodStore();
  const [filter, setFilter] = useState('ALL');
  const [acknowledged, setAcknowledged] = useState(new Set());
  const [tab, setTab] = useState('active'); // 'active' | 'acknowledged'
  const [selectedAlert, setSelectedAlert] = useState(null);

  const alerts = alertsData?.alerts || [];
  const criticalCount = alertsData?.critical_count || 0;
  const unackCount = alerts.filter(a => !acknowledged.has(a.id)).length;

  const filtered = useMemo(() => {
    let list = alerts;
    if (tab === 'acknowledged') {
      list = list.filter(a => acknowledged.has(a.id));
    } else {
      list = list.filter(a => !acknowledged.has(a.id));
    }
    if (filter !== 'ALL') {
      list = list.filter(a => a.level === filter);
    }
    return list;
  }, [alerts, filter, tab, acknowledged]);

  const handleAcknowledge = (id) => {
    setAcknowledged(prev => new Set([...prev, id]));
  };

  const handleViewOnMap = (alert) => {
    const d = districts.find(dd => dd.district === alert.district);
    if (d) selectDistrict(d);
    setSelectedAlert({ district: alert.district, state: alert.state || selectedState });
  };

  return (
    <div className="p-6 space-y-5">
      <div className="page-header rounded-lg">
        <div className="flex items-center gap-3">
          <h1>🚨 Alert Management — {selectedState}</h1>
          {unackCount > 0 && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-white/20">
              {unackCount} unacknowledged
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/80">{alerts.length} total alerts</span>
          {criticalCount > 0 && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-500/30 text-white">
              {criticalCount} CRITICAL
            </span>
          )}
        </div>
      </div>

      {/* Tabs + Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setTab('active')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'active' ? 'bg-accent-primary text-white' : 'bg-white text-text-muted border border-border hover:bg-gray-50'}`}>
            Active ({alerts.length - acknowledged.size})
          </button>
          <button onClick={() => setTab('acknowledged')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'acknowledged' ? 'bg-accent-primary text-white' : 'bg-white text-text-muted border border-border hover:bg-gray-50'}`}>
            Acknowledged ({acknowledged.size})
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-text-muted" />
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map(level => (
            <button key={level} onClick={() => setFilter(level)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === level ? 'bg-gov-navy text-white' : 'bg-white text-text-muted border border-border hover:bg-gray-50'}`}>
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <Bell size={40} className="mx-auto text-text-muted mb-3" />
          <div className="text-sm text-text-muted">No {tab === 'acknowledged' ? 'acknowledged' : 'active'} alerts{filter !== 'ALL' ? ` at ${filter} level` : ''}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert, i) => {
            const color = getAlertLevelColor(alert.level);
            const isAcked = acknowledged.has(alert.id);
            return (
              <div key={alert.id || i}
                className={`bg-white rounded-xl border border-border p-4 animate-slide-up transition-all ${isAcked ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${i * 30}ms`, borderLeft: `4px solid ${color}` }}>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{ background: `${color}15`, color, border: `1px solid ${color}40` }}>
                        {alert.level}
                      </span>
                      <span className="text-xs text-text-muted font-[family-name:var(--font-data)]">
                        {alert.district}, {alert.state}
                      </span>
                      <span className="text-[10px] text-text-muted">• {timeAgo(alert.triggered_at)}</span>
                    </div>
                    <h4 className="text-sm font-bold text-gov-navy mb-1">{alert.title}</h4>
                    <p className="text-xs text-text-muted mb-2">{alert.message}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-text-muted">Severity: <strong className="font-[family-name:var(--font-data)]">{alert.severity_score?.toFixed(1)}</strong></span>
                      <span className="text-text-muted">Rainfall: <strong className="font-[family-name:var(--font-data)]">{alert.rainfall_mm?.toFixed(0)} mm</strong></span>
                      <span className="text-text-muted">Action: <strong>{alert.action_required}</strong></span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => handleViewOnMap(alert)} className="btn-secondary text-xs">VIEW →</button>
                    {!isAcked && (
                      <button onClick={() => handleAcknowledge(alert.id)} className="btn-primary text-xs flex items-center gap-1">
                        <Check size={12} /> Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
