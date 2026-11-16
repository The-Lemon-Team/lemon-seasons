import React from 'react';
import { LayoutDashboard, FileText, Rss, Radio, CalendarRange, Sparkles, RefreshCw } from 'lucide-react';
import { resolvePeerAppUrl } from '@lenta/shared';
import { AdminTranslations } from '../../i18n';

export type AdminStringKey = {
  [K in keyof AdminTranslations]: AdminTranslations[K] extends string ? K : never;
}[keyof AdminTranslations];

export interface SidebarNavItem {
  to: string;
  end?: boolean;
  labelKey: AdminStringKey;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  iconClassName?: string;
}

export const EXTERNAL_APP_URLS = {
  defiChat: resolvePeerAppUrl(import.meta.env.VITE_DEFI_CHAT_URL, 3000, 3000, import.meta.env.PROD),
  calendarApp: resolvePeerAppUrl(import.meta.env.VITE_CALENDAR_APP_URL, 5174, 5174, import.meta.env.PROD),
  feedApp: resolvePeerAppUrl(import.meta.env.VITE_FEED_APP_URL, 5175, 5180, import.meta.env.PROD),
  apiDocs: `${resolvePeerAppUrl(import.meta.env.VITE_API_URL, 3001, 3002, import.meta.env.PROD)}/api/docs`,
};

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  {
    to: '/',
    end: true,
    labelKey: 'adminTagline',
    icon: LayoutDashboard,
  },
  {
    to: '/notes',
    labelKey: 'allNotes',
    icon: FileText,
  },
  {
    to: '/feeds',
    labelKey: 'feeds',
    icon: Rss,
  },
  {
    to: '/streams',
    labelKey: 'streams',
    icon: Radio,
    badge: 'Hub',
    iconClassName: 'text-indigo-400',
  },
  {
    to: '/periods',
    labelKey: 'periodsHubTitle',
    icon: CalendarRange,
    iconClassName: 'text-emerald-400',
  },
  {
    to: '/generators',
    labelKey: 'generatorLab',
    icon: Sparkles,
    badge: 'Lab',
    iconClassName: 'text-amber-500',
  },
  {
    to: '/sync',
    labelKey: 'syncHub',
    icon: RefreshCw,
  },
];
