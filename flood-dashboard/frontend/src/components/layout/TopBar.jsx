import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import useFloodStore from '../../store/floodStore';
import { timeAgo } from '../../utils/formatters';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/weather': 'Weather Monitor',
  '/analytics': 'Analytics',
  '/resources': 'Resource Allocation',
  '/routing': 'Dispatch Routing',
  '/alerts': 'Alert Management',
  '/reports': 'Reports & Export',
};

export default function TopBar() {
  const {
    selectedState,
    alertsData,
    stateSummary,
    lastRefresh,
    refreshAll,
    loading,
    weatherApiStatus,
    fetchWeatherStatus,
  } = useFloodStore();
  const [time, setTime] = useState(new Date());
  const location = useLocation();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // Keep API badge in sync with backend key activation.
    fetchWeatherStatus();
    const id = setInterval(() => {
      fetchWeatherStatus();
    }, 30000);
    return () => clearInterval(id);
  }, [fetchWeatherStatus]);

  const istTime = time.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });

  const criticalAlerts = alertsData?.critical_count || 0;
  const totalAlerts = alertsData?.alert_count || 0;
  const pageTitle = PAGE_TITLES[location.pathname] || 'Dashboard';

  const apiStatusLabel = weatherApiStatus === 'active' ? '🟢 Live' : weatherApiStatus === 'pending' ? '⏳ Activating' : '🔴 Offline';
  const apiStatusClass = weatherApiStatus === 'active' ? 'status-live' : weatherApiStatus === 'pending' ? 'status-simulated' : 'status-failed';

  return (
    <header className="h-14 flex items-center justify-between px-5 border-b border-border bg-white shadow-sm z-50 shrink-0">
      {/* Left: Logo + State */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌊</span>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-gov-navy">DRMS</h1>
            <span className="text-[10px] text-text-muted hidden md:block">Disaster Relief Management System</span>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-border" />
        {selectedState && (
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm font-semibold text-gov-navy">{selectedState}</span>
            {stateSummary && (
              <span className="text-xs text-text-muted">({stateSummary.total_districts} districts)</span>
            )}
            <span className="text-xs text-text-muted">•</span>
            <span className="text-sm font-medium text-text-primary">{pageTitle}</span>
          </div>
        )}
      </div>

      {/* Right: Status indicators */}
      <div className="flex items-center gap-3">
        {/* API Status */}
        <span className={apiStatusClass}>{apiStatusLabel}</span>

        {/* Last refresh */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-muted">
          <span>Updated: {timeAgo(lastRefresh)}</span>
          <button
            onClick={refreshAll}
            disabled={loading.dashboard}
            className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw size={14} className={loading.dashboard ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Clock */}
        <span className="text-xs text-text-muted hidden lg:block font-[family-name:var(--font-data)]">
          {istTime}
        </span>

        {/* Alerts */}
        {totalAlerts > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{
            background: criticalAlerts > 0 ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${criticalAlerts > 0 ? '#fca5a5' : '#fde68a'}`,
          }}>
            <span className="text-xs">⚠️</span>
            <span className="text-xs font-bold" style={{ color: criticalAlerts > 0 ? '#dc2626' : '#ca8a04' }}>
              {totalAlerts} ALERTS
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
