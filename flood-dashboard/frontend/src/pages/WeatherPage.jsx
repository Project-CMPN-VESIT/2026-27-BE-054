import { useEffect, useMemo } from 'react';
import useFloodStore from '../store/floodStore';
import { formatIndian } from '../utils/formatters';

export default function WeatherPage() {
  const { selectedState, bulkWeather, weatherApiStatus, fetchWeatherBulk, loading, error } = useFloodStore();

  useEffect(() => {
    if (selectedState && !bulkWeather) {
      fetchWeatherBulk(selectedState);
    }
  }, [selectedState, bulkWeather, fetchWeatherBulk]);

  const districts = bulkWeather?.districts || [];

  const summary = useMemo(() => {
    if (!districts.length) return null;
    const rainfalls = districts.map(d => d.current?.rainfall_1hr_mm || 0);
    const humidities = districts.map(d => d.current?.humidity_pct || 0);
    const temps = districts.map(d => d.current?.temp_c || 0);
    const avgRain = rainfalls.reduce((a, b) => a + b, 0) / rainfalls.length;
    const maxRain = Math.max(...rainfalls);
    const maxRainDist = districts[rainfalls.indexOf(maxRain)]?.district || '—';
    const heavyRainCount = rainfalls.filter(r => r > 50).length;
    const avgHum = humidities.reduce((a, b) => a + b, 0) / humidities.length;
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    return { avgRain, maxRain, maxRainDist, heavyRainCount, avgHum, avgTemp };
  }, [districts]);

  const isLive = weatherApiStatus === 'active';

  return (
    <div className="p-6 space-y-5">
      {/* Page Header */}
      <div className="page-header rounded-lg">
        <h1>🌦️ Weather Monitor — {selectedState}</h1>
        <span className={isLive ? 'status-live' : 'status-simulated'}>
          {isLive
            ? `🟢 Live data from OpenWeather API`
            : '⏳ API key activating — showing estimated values based on historical data'}
        </span>
      </div>

      {/* Summary Bar */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="kpi-card">
            <div className="text-[10px] text-text-muted font-semibold uppercase">Avg Rainfall</div>
            <div className="text-lg font-bold text-accent-primary font-[family-name:var(--font-data)]">{summary.avgRain.toFixed(1)} mm</div>
          </div>
          <div className="kpi-card">
            <div className="text-[10px] text-text-muted font-semibold uppercase">Max Rainfall</div>
            <div className="text-lg font-bold text-severity-critical font-[family-name:var(--font-data)]">{summary.maxRain.toFixed(1)} mm</div>
            <div className="text-[10px] text-text-muted">{summary.maxRainDist}</div>
          </div>
          <div className="kpi-card">
            <div className="text-[10px] text-text-muted font-semibold uppercase">Heavy Rain (&gt;50mm)</div>
            <div className="text-lg font-bold text-severity-high font-[family-name:var(--font-data)]">{summary.heavyRainCount}</div>
            <div className="text-[10px] text-text-muted">districts</div>
          </div>
          <div className="kpi-card">
            <div className="text-[10px] text-text-muted font-semibold uppercase">Avg Humidity</div>
            <div className="text-lg font-bold text-accent-secondary font-[family-name:var(--font-data)]">{summary.avgHum.toFixed(0)}%</div>
          </div>
          <div className="kpi-card">
            <div className="text-[10px] text-text-muted font-semibold uppercase">Avg Temperature</div>
            <div className="text-lg font-bold text-severity-medium font-[family-name:var(--font-data)]">{summary.avgTemp.toFixed(1)}°C</div>
          </div>
        </div>
      )}

      {/* District Weather Cards */}
      {loading.weather ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      ) : !districts.length ? (
        <div className="bg-white rounded-xl border border-border p-6 text-center">
          <div className="text-sm font-semibold text-gov-navy mb-2">Weather data not available yet</div>
          <div className="text-xs text-text-muted mb-4">
            {error || 'No district weather records were returned for this state.'}
          </div>
          <button className="btn-primary" onClick={() => fetchWeatherBulk(selectedState)}>
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {districts.map(d => {
            const c = d.current || {};
            const f = d.forecast || {};
            const anomaly = d.monsoon_avg_daily_rain_mm
              ? (c.rainfall_1hr_mm || 0) / Math.max(d.monsoon_avg_daily_rain_mm, 0.01)
              : 0;
            const anomalyColor = anomaly > 2.5 ? '#dc2626' : anomaly > 1.5 ? '#ea580c' : '#16a34a';

            return (
              <div key={d.district} className="bg-white rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-gov-navy">{d.district}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: anomalyColor + '15', color: anomalyColor, border: `1px solid ${anomalyColor}40` }}>
                    {anomaly.toFixed(1)}x
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-text-muted">🌡️ Temp</span><div className="font-bold font-[family-name:var(--font-data)]">{c.temp_c?.toFixed(1) || '—'}°C</div></div>
                  <div><span className="text-text-muted">💧 Rain/hr</span><div className="font-bold font-[family-name:var(--font-data)]">{c.rainfall_1hr_mm?.toFixed(1) || '0'} mm</div></div>
                  <div><span className="text-text-muted">💨 Wind</span><div className="font-bold font-[family-name:var(--font-data)]">{c.wind_speed_ms?.toFixed(1) || '—'} m/s</div></div>
                  <div><span className="text-text-muted">☁️ Humidity</span><div className="font-bold font-[family-name:var(--font-data)]">{c.humidity_pct || '—'}%</div></div>
                </div>
                <div className="mt-3 pt-2 border-t border-border text-[11px] text-text-muted">
                  <span>24hr forecast: <strong className="text-text-primary">{f.next_24hr_rain_mm?.toFixed(1) || '—'} mm</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
