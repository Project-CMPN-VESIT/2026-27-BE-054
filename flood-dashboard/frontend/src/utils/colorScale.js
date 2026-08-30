/**
 * Severity color scale utilities — light theme variant.
 */
export function getSeverityColor(score) {
  if (score >= 7.0) return '#dc2626';   // RED    — Critical
  if (score >= 5.0) return '#ea580c';   // ORANGE — High
  if (score >= 3.0) return '#ca8a04';   // YELLOW — Medium
  if (score >= 1.0) return '#16a34a';   // GREEN  — Low
  return '#94a3b8';                      // GREY   — No data
}

export function getSeverityClass(score) {
  if (score >= 7) return 'critical';
  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  if (score >= 1) return 'low';
  return 'minimal';
}

export function getSeverityEmoji(score) {
  if (score >= 7) return '🔴';
  if (score >= 5) return '🟠';
  if (score >= 3) return '🟡';
  if (score >= 1) return '🟢';
  return '⚪';
}

export function getSeverityBadge(score) {
  if (score >= 7) return { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5', label: 'CRITICAL' };
  if (score >= 5) return { bg: '#fff7ed', text: '#92400e', border: '#fcd34d', label: 'HIGH' };
  if (score >= 3) return { bg: '#fffbeb', text: '#78350f', border: '#fde68a', label: 'MEDIUM' };
  return { bg: '#f0fdf4', text: '#14532d', border: '#86efac', label: 'LOW' };
}

export function getAlertLevelColor(level) {
  switch (level?.toUpperCase()) {
    case 'CRITICAL': return '#dc2626';
    case 'HIGH': return '#ea580c';
    case 'MEDIUM': return '#ca8a04';
    case 'LOW': return '#16a34a';
    default: return '#64748b';
  }
}

export function getEmergencyColor(level) {
  switch (level) {
    case 'RED': return '#dc2626';
    case 'ORANGE': return '#ea580c';
    case 'YELLOW': return '#ca8a04';
    case 'GREEN': return '#16a34a';
    default: return '#64748b';
  }
}
