/**
 * Number and text formatting utilities (Indian number system).
 */

export function formatPopulation(num) {
  if (!num || isNaN(num)) return '0';
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)} Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(1)} L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)} K`;
  return num.toString();
}

export function formatIndian(num) {
  if (!num) return '0';
  if (num >= 10000000) return (num / 10000000).toFixed(2) + ' Cr';
  if (num >= 100000) return (num / 100000).toFixed(2) + ' L';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return Math.round(num).toString();
}

export function formatINR(amount) {
  if (!amount || isNaN(amount)) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatNumber(num, decimals = 0) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Number(num).toLocaleString('en-IN', { maximumFractionDigits: decimals });
}

export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${Number(value).toFixed(decimals)}%`;
}

export function timeAgo(date) {
  if (!date) return 'Never';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

export function truncate(str, maxLen = 20) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen - 2) + '..' : str;
}
