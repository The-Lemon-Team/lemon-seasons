export interface DeviceThemeConfig {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
}

export const KNOWN_DEVICE_THEMES: Record<string, DeviceThemeConfig> = {
  alovingpc: {
    label: 'alovingpc (Текущий ПК)',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    badgeBorder: 'border-emerald-500/30',
    dotColor: 'bg-emerald-500',
  },
  'pc-main': {
    label: 'PC-MAIN (Основной узел)',
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/15',
    badgeText: 'text-blue-700 dark:text-blue-400',
    badgeBorder: 'border-blue-500/30',
    dotColor: 'bg-blue-500',
  },
  'pc-laptop': {
    label: 'PC-LAPTOP (Ноутбук)',
    badgeBg: 'bg-purple-500/10 dark:bg-purple-500/15',
    badgeText: 'text-purple-700 dark:text-purple-400',
    badgeBorder: 'border-purple-500/30',
    dotColor: 'bg-purple-500',
  },
  mobile: {
    label: 'Mobile Node',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/15',
    badgeText: 'text-amber-700 dark:text-amber-400',
    badgeBorder: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
  },
};

export const ACTION_THEMES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  UPSERT: {
    label: 'UPSERT',
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-500/30',
  },
  STATUS_CHANGE: {
    label: 'STATUS',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
  },
  DELETE: {
    label: 'DELETE',
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
  },
};
