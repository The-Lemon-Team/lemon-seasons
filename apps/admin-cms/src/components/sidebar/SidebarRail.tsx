import React from 'react';
import { NavLink } from 'react-router-dom';
import { Tooltip } from 'antd';
import {
  Plus,
  PanelLeftOpen,
  PanelTopClose,
  Bot,
  Calendar,
  Radio,
} from 'lucide-react';
import { LemonLogo } from '../LemonLogo';
import { useAdminI18n } from '../../i18n';
import { SIDEBAR_NAV_ITEMS, EXTERNAL_APP_URLS } from './sidebar.constants';
import { AppSidebarProps } from './sidebar.types';

export const SidebarRail: React.FC<AppSidebarProps> = ({
  onToggle,
  onToggleVertical,
  onOpenQuickAdd,
}) => {
  const { t } = useAdminI18n();

  return (
    <aside className="w-12 h-fit self-start shrink-0 rounded-2xl bg-panel border border-panel shadow-panel flex flex-col p-1.5 items-center gap-1.5 z-20 select-none transition-all duration-200 ease-in-out">
      {/* Logo */}
      <NavLink
        to="/"
        className="p-1 rounded-xl hover:bg-tile-subtle transition-all cursor-pointer"
        title="Lemon CMS — Панель управления"
      >
        <LemonLogo size={22} className="transition-transform hover:scale-105" />
      </NavLink>

      {/* Horizontal Expand Button */}
      <Tooltip title="Развернуть меню" placement="right">
        <button
          type="button"
          onClick={onToggle}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-tile-subtle transition-colors cursor-pointer"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      </Tooltip>

      {/* Vertical Fold Button */}
      {onToggleVertical && (
        <Tooltip title="Свернуть по вертикали" placement="right">
          <button
            type="button"
            onClick={onToggleVertical}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-tile-subtle transition-colors cursor-pointer"
          >
            <PanelTopClose className="w-4 h-4" />
          </button>
        </Tooltip>
      )}

      {/* Quick Add Button */}
      <Tooltip title={t.quickAdd} placement="right">
        <button
          type="button"
          onClick={onOpenQuickAdd}
          className="w-8 h-8 rounded-lg bg-tile-subtle border border-tile-border hover:border-primary/50 text-primary flex items-center justify-center transition-all cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
        </button>
      </Tooltip>

      <div className="w-6 border-t border-tile-border my-0.5" />

      {/* Navigation Links */}
      {SIDEBAR_NAV_ITEMS.map((item) => {
        const IconComponent = item.icon;
        const label = t[item.labelKey] as string;
        return (
          <Tooltip key={item.to} title={label} placement="right">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-primary text-on-primary font-semibold shadow-xs'
                    : 'text-on-surface-variant hover:bg-tile-subtle hover:text-on-surface'
                }`
              }
            >
              <IconComponent className={`w-4 h-4 ${item.iconClassName || ''}`} />
            </NavLink>
          </Tooltip>
        );
      })}

      <div className="w-6 border-t border-tile-border my-0.5" />

      {/* External Integrations */}
      <Tooltip title="Defi Chat" placement="right">
        <a
          href={EXTERNAL_APP_URLS.defiChat}
          target="_blank"
          rel="noreferrer"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-tile-subtle hover:text-cyan-500 transition-colors"
        >
          <Bot className="w-4 h-4" />
        </a>
      </Tooltip>

      <Tooltip title={t.toCalendar} placement="right">
        <a
          href={EXTERNAL_APP_URLS.calendarApp}
          target="_blank"
          rel="noreferrer"
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-container border border-primary-border text-primary hover:opacity-90 transition-all shadow-xs"
        >
          <Calendar className="w-4 h-4" />
        </a>
      </Tooltip>

      <Tooltip title={t.feedAppTitle} placement="right">
        <a
          href={EXTERNAL_APP_URLS.feedApp}
          target="_blank"
          rel="noreferrer"
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-sky-500/10 border border-sky-500/25 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-all shadow-xs"
        >
          <Radio className="w-4 h-4" />
        </a>
      </Tooltip>
    </aside>
  );
};
