import React from 'react';
import { LayoutDashboard, FileText, Rss, Sparkles, RefreshCw } from 'lucide-react';
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
