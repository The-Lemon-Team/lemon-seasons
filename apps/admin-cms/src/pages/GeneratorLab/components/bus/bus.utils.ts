import { KNOWN_DEVICE_THEMES, DeviceThemeConfig } from './bus.constants';

export function getDeviceTheme(deviceId: string): DeviceThemeConfig {
  const normalized = (deviceId || '').toLowerCase();
  if (KNOWN_DEVICE_THEMES[normalized]) {
    return KNOWN_DEVICE_THEMES[normalized];
  }

  // Dynamic deterministic palette for arbitrary device IDs
  return {
    label: deviceId || 'Unknown Device',
    badgeBg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    badgeText: 'text-indigo-600 dark:text-indigo-400',
    badgeBorder: 'border-indigo-500/30',
    dotColor: 'bg-indigo-500',
  };
}

export function formatEventTimestamp(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 10) return 'только что';
    if (diffSec < 60) return `${diffSec} сек назад`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} мин назад`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} ч назад`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} дн назад`;
  } catch {
    return '';
  }
}

export function truncateText(text?: string | null, maxLen = 140): string {
  if (!text) return '';
  const clean = text.replace(/[\r\n]+/g, ' ').trim();
  return clean.length > maxLen ? `${clean.slice(0, maxLen)}...` : clean;
}
