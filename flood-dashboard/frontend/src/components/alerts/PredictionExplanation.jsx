import { Cloud, Calendar, Map, BarChart2, Package, Eye, Bot } from 'lucide-react';

const FACTOR_META = [
  { label: 'Rainfall Anomaly', Icon: Cloud },
  { label: 'Flood Frequency', Icon: Calendar },
  { label: 'Flood Prone Area', Icon: Map },
  { label: 'Severity Score', Icon: BarChart2 },
  { label: 'Resource Gap', Icon: Package },
  { label: 'Forecast', Icon: Eye },
  { label: 'ML Model Prediction', Icon: Bot },
];

function detectMeta(text, idx) {
  const value = (text || '').toLowerCase();
  if (value.includes('rainfall')) return FACTOR_META[0];
  if (value.includes('flood events')) return FACTOR_META[1];
  if (value.includes('flood-prone')) return FACTOR_META[2];
  if (value.includes('severity score')) return FACTOR_META[3];
  if (value.includes('resource gap')) return FACTOR_META[4];
  if (value.includes('24-hour rainfall forecast')) return FACTOR_META[5];
  if (value.includes('xgboost')) return FACTOR_META[6];
  return FACTOR_META[idx] || { label: 'Risk Factor', Icon: BarChart2 };
}

export default function PredictionExplanation({ factors }) {
  if (!Array.isArray(factors) || factors.length === 0) {
    return <div className="text-sm text-text-muted">No explanation factors available.</div>;
  }

  return (
    <div>
      {factors.map((item, idx) => {
        const { label, Icon } = detectMeta(item, idx);
        return (
          <div key={`${idx}-${item.slice(0, 18)}`} className="factor-card">
            <div className="factor-icon">
              <Icon size={18} color="#3b82f6" />
            </div>
            <div>
              <div className="factor-label">{label}</div>
              <div className="factor-text">{item}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
