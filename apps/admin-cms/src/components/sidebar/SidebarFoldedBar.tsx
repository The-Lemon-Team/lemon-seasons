import React from 'react';
import { NavLink } from 'react-router-dom';
import { Tooltip } from 'antd';
import { Plus, PanelTopOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { LemonLogo } from '../LemonLogo';
import { useAdminI18n } from '../../i18n';
import { AppSidebarProps } from './sidebar.types';

export const SidebarFoldedBar: React.FC<AppSidebarProps> = ({
  collapsed,
  onToggle,
  onToggleVertical,
  onOpenQuickAdd,
}) => {
  const { t } = useAdminI18n();

  if (collapsed) {
    return (
      <aside className="w-12 h-11 shrink-0 rounded-2xl bg-panel border border-panel shadow-panel flex items-center justify-center p-1 z-20 select-none transition-all duration-200 ease-in-out">
        <Tooltip title="Развернуть боковую панель" placement="right">
          <button
            type="button"
            onClick={onToggleVertical}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-tile-subtle transition-colors cursor-pointer group"
          >
            <LemonLogo size={18} className="group-hover:hidden transition-transform" />
            <PanelTopOpen className="w-4 h-4 hidden group-hover:block text-primary" />
          </button>
        </Tooltip>
      </aside>
    );
  }

  return (
    <aside className="w-52 lg:w-56 h-11 shrink-0 rounded-2xl bg-panel border border-panel shadow-panel px-2.5 flex items-center justify-between z-20 select-none transition-all duration-200 ease-in-out">
      {/* Brand Header */}
      <NavLink
        to="/"
        className="flex items-center gap-1.5 group cursor-pointer min-w-0"
        title="Lemon CMS — Панель управления"
      >
        <LemonLogo size={22} className="transition-transform group-hover:scale-105 shrink-0" />
        <div className="min-w-0 flex items-center gap-1">
          <span className="font-sans font-bold text-[11px] text-primary tracking-wider uppercase group-hover:opacity-80 transition-opacity truncate">
            {t.adminTitle}
          </span>
          <span className="text-[9px] font-mono uppercase px-1 py-0.2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300 rounded font-bold shrink-0">
            CMS
          </span>
        </div>
      </NavLink>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <Tooltip title={t.quickAdd} placement="bottom">
          <button
            type="button"
            onClick={onOpenQuickAdd}
            className="w-7 h-7 rounded-lg bg-tile-subtle border border-tile-border hover:border-primary/50 text-primary flex items-center justify-center transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </Tooltip>

        <Tooltip title="Развернуть меню вниз" placement="bottom">
          <button
            type="button"
            onClick={onToggleVertical}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-tile-subtle transition-colors cursor-pointer"
          >
            <PanelTopOpen className="w-4 h-4" />
          </button>
        </Tooltip>

        <Tooltip title="Свернуть в мини-колонку" placement="bottom">
          <button
            type="button"
            onClick={onToggle}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-tile-subtle transition-colors cursor-pointer"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>
    </aside>
  );
};
