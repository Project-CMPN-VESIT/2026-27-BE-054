import { useState, useEffect } from 'react';
import useFloodStore from '../store/floodStore';
import { formatIndian } from '../utils/formatters';
import { getSeverityBadge } from '../utils/colorScale';
import { Download, Calendar, Mail } from 'lucide-react';

export default function ReportsPage() {
  const { selectedState, districts, stateSummary } = useFloodStore();
  const [preview, setPreview] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const now = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const resp = await fetch(`/api/reports/csv?state=${encodeURIComponent(selectedState)}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contentDisposition = resp.headers.get('Content-Disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || `DRMS_${selectedState}_Report.csv`;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed:', e);
    }
    setDownloading(false);
  };

  // Build preview from local districts data
  const previewRows = (districts || []).slice(0, 10).map(d => {
    const badge = getSeverityBadge(d.severity_score);
    return { ...d, badge };
  });

  return (
    <div className="p-6 space-y-5">
      <div className="page-header rounded-lg">
        <h1>📋 Reports & Export — {selectedState}</h1>
      </div>

      {/* Report Metadata */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-text-muted font-semibold uppercase mb-1">Report Generated</div>
            <div className="text-sm font-bold text-gov-navy">{now} IST</div>
          </div>
          <div>
            <div className="text-xs text-text-muted font-semibold uppercase mb-1">State</div>
            <div className="text-sm font-bold text-gov-navy">{selectedState} | {stateSummary?.total_districts || 0} Districts</div>
          </div>
          <div>
            <div className="text-xs text-text-muted font-semibold uppercase mb-1">Data Source</div>
            <div className="text-sm font-bold text-gov-navy">DRMS + OpenWeather API</div>
          </div>
        </div>
      </div>

      {/* Download Section */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gov-navy">Complete State Report</h3>
            <p className="text-xs text-text-muted mt-1">
              Includes: severity scores, predictions, resource allocation, alerts, rainfall data, and recommendations for all {stateSummary?.total_districts || 0} districts
            </p>
          </div>
          <button onClick={handleDownload} disabled={downloading} className="btn-primary flex items-center gap-2">
            <Download size={16} />
            {downloading ? 'Generating...' : 'Download CSV Report'}
          </button>
        </div>

        {/* 25 Column list */}
        <div className="text-[11px] text-text-muted">
          <span className="font-semibold">Columns: </span>
          District, State, Severity, Predicted Severity, Flood Probability, Risk Level, Population, Affected Pop, Deaths, Flood Freq, Monsoon Rain, Resource Gap, Teams, Cost, Priority Score/Rank, Rainfall, Forecast, Anomaly, Alert Level, Recommendation, Timestamp
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-bold text-gov-navy">Preview (first 10 rows)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>District</th>
                <th>Severity</th>
                <th>Population</th>
                <th>Affected</th>
                <th>Gap %</th>
                <th>Flood Freq</th>
                <th>Rain (mm)</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map(d => (
                <tr key={d.district}>
                  <td className="font-medium">{d.district}</td>
                  <td>
                    <span className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{ background: d.badge.bg, color: d.badge.text, border: `1px solid ${d.badge.border}` }}>
                      {d.severity_score?.toFixed(1)} — {d.badge.label}
                    </span>
                  </td>
                  <td className="font-[family-name:var(--font-data)]">{formatIndian(d.population)}</td>
                  <td className="font-[family-name:var(--font-data)]">{formatIndian(d.impact_population)}</td>
                  <td className="font-[family-name:var(--font-data)]">{(d.resource_gap_score * 100).toFixed(1)}%</td>
                  <td className="font-[family-name:var(--font-data)]">{d.flood_freq_per_year?.toFixed(3)}</td>
                  <td className="font-[family-name:var(--font-data)]">{d.monsoon_rain_mm?.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Reports (UI only) */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-bold text-gov-navy mb-3">📅 Schedule Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'Daily Summary', desc: 'Automated daily report at 06:00 IST', icon: Calendar },
            { label: 'Weekly Analysis', desc: 'Comprehensive weekly review every Monday', icon: Calendar },
            { label: 'On Alert Trigger', desc: 'Instant report when CRITICAL alert fires', icon: Mail },
          ].map(item => (
            <div key={item.label} className="p-4 border border-border rounded-lg hover:border-accent-primary/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <item.icon size={16} className="text-accent-primary" />
                <span className="text-sm font-semibold text-gov-navy">{item.label}</span>
              </div>
              <p className="text-xs text-text-muted mb-3">{item.desc}</p>
              <div className="text-[11px] text-accent-primary font-medium">📧 Email scheduling coming soon</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
