import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Cloud, BarChart3, Package, Route, Bell, FileText, ArrowLeft } from 'lucide-react';
import useFloodStore from '../../store/floodStore';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/weather', label: 'Weather', icon: Cloud },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/resources', label: 'Resources', icon: Package },
  { path: '/routing', label: 'Routing', icon: Route },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/reports', label: 'Reports', icon: FileText },
];

export default function Sidebar() {
  const { selectedState, clearState, alertsData, stateSummary } = useFloodStore();
  const location = useLocation();
  const navigate = useNavigate();

  const criticalAlerts = alertsData?.critical_count || 0;
  const totalAlerts = alertsData?.alert_count || 0;

  return (
    <aside className="w-56 bg-white border-r border-border flex flex-col h-full shrink-0">
      {/* State header */}
      <div className="p-4 border-b border-border">
        <button
          onClick={() => { clearState(); navigate('/'); }}
          className="flex items-center gap-1.5 text-xs text-accent-primary hover:text-accent-secondary transition-colors cursor-pointer mb-2"
        >
          <ArrowLeft size={12} />
          Change State
        </button>
        <h2 className="text-base font-bold text-gov-navy">{selectedState}</h2>
        {stateSummary && (
          <span className="text-xs text-text-muted">{stateSummary.total_districts} districts monitored</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const alertBadge = item.path === '/alerts' && totalAlerts > 0;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span className="flex-1">{item.label}</span>
              {alertBadge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{
                  background: criticalAlerts > 0 ? '#fef2f2' : '#fffbeb',
                  color: criticalAlerts > 0 ? '#dc2626' : '#ca8a04',
                }}>
                  {totalAlerts}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick summary footer */}
      <div className="p-4 border-t border-border">
        <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Quick Status</div>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-text-muted">Critical</span>
            <span className="font-bold text-severity-critical">{stateSummary?.high_risk_count || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Medium</span>
            <span className="font-bold text-severity-medium">{stateSummary?.medium_risk_count || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Low</span>
            <span className="font-bold text-severity-low">{stateSummary?.low_risk_count || 0}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
