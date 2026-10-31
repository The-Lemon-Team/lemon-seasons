import React from 'react';
import { NavLink } from 'react-router-dom';
import { Tooltip } from 'antd';
import {
  Plus,
  Bot,
  Calendar,
  ExternalLink,
  PanelLeftClose,
  PanelTopClose,
  BookOpen,
  Radio,
} from 'lucide-react';
import { LemonLogo } from '../LemonLogo';
import { useSyncChanges } from '../../api/queries';
import { useAdminI18n } from '../../i18n';
import { SIDEBAR_NAV_ITEMS, EXTERNAL_APP_URLS } from './sidebar.constants';
import { AppSidebarProps } from './sidebar.types';

export const SidebarExpanded: React.FC<AppSidebarProps> = ({
  onToggle,
  onToggleVertical,
  onOpenQuickAdd,
}) => {
  const { t } = useAdminI18n();
  const { data: syncData, isFetching: isSyncing } = useSyncChanges();

  return (
    <aside className="w-52 lg:w-56 h-full shrink-0 rounded-2xl bg-panel border border-panel shadow-panel flex flex-col p-2.5 justify-between z-20 overflow-hidden select-none transition-all duration-200 ease-in-out">
      {/* Brand Header */}
      <div className="mb-2 flex items-center justify-between w-full">
        <NavLink
          to="/"
          className="flex items-center gap-2 group cursor-pointer min-w-0"
          title={t.dashboard}
        >
          <LemonLogo size={24} className="transition-transform group-hover:scale-105 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-sans font-bold text-[11px] text-primary tracking-wider uppercase group-hover:opacity-80 transition-opacity truncate">
                {t.adminTitle}
              </span>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300 rounded font-bold shrink-0">
                CMS
              </span>
            </div>
            <p className="text-[11px] font-sans font-semibold text-on-surface truncate">
              {t.adminTagline}
            </p>
          </div>
        </NavLink>

        <div className="flex items-center gap-0.5 shrink-0">
          {onToggleVertical && (
            <Tooltip title="Свернуть по вертикали" placement="bottom">
              <button
                type="button"
                onClick={onToggleVertical}
                className="p-1 rounded-lg hover:bg-tile-subtle text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              >
                <PanelTopClose className="w-4 h-4" />
              </button>
            </Tooltip>
          )}

          <Tooltip title="Свернуть в мини-колонку" placement="bottom">
            <button
              type="button"
              onClick={onToggle}
              className="p-1 rounded-lg hover:bg-tile-subtle text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Quick Add CTA Button */}
      <button
        type="button"
        onClick={onOpenQuickAdd}
        className="h-7.5 bg-tile-subtle border border-tile-border hover:border-primary/50 hover:text-primary text-on-surface font-mono text-[11px] px-2.5 rounded-xl transition-all flex justify-center items-center gap-1.5 w-full mb-1.5 shadow-xs group cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5 text-primary group-hover:rotate-90 transition-transform duration-200" />
        <span>{t.quickAdd}</span>
      </button>

      {/* Primary Navigation Links */}
      <nav className="flex flex-col gap-1 flex-1 overflow-y-auto no-scrollbar">
        {SIDEBAR_NAV_ITEMS.map((item) => {
          const IconComponent = item.icon;
          const label = t[item.labelKey] as string;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-2.5 py-1 h-7.5 flex items-center justify-between transition-all duration-150 font-mono text-[11px] rounded-lg ${
                  isActive
                    ? 'bg-primary text-on-primary font-semibold shadow-xs'
                    : 'text-on-surface-variant hover:bg-tile-subtle hover:text-on-surface'
                }`
              }
            >
              <div className="flex items-center gap-2 truncate">
                <IconComponent className={`w-3.5 h-3.5 shrink-0 ${item.iconClassName || ''}`} />
                <span className="truncate">{label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400 font-mono font-bold">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}

        {/* External Integrations Section */}
        <div className="mt-2 pt-2 border-t border-tile-border flex flex-col gap-1">
          <p className="px-2 mb-0.5 text-[9px] font-mono uppercase tracking-wider text-text-muted">
            Внешние сервисы
          </p>
          <a
            href={EXTERNAL_APP_URLS.defiChat}
            target="_blank"
            rel="noreferrer"
            className="px-2 py-1 h-6.5 flex items-center justify-between text-on-surface-variant hover:bg-tile-subtle hover:text-on-surface transition-all font-mono text-[10px] rounded-lg group"
            title="Открыть Defi Chat (http://localhost:3000)"
          >
            <div className="flex items-center gap-2 truncate">
              <Bot className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span className="truncate">Defi Chat</span>
            </div>
            <ExternalLink className="w-2.5 h-2.5 text-text-muted group-hover:text-cyan-500 transition-colors shrink-0" />
          </a>

          {/* Symmetrical link to Calendar App */}
          <a
            href={EXTERNAL_APP_URLS.calendarApp}
            target="_blank"
            rel="noreferrer"
            className="px-2 py-1 h-6.5 flex items-center justify-between bg-primary-container border border-primary-border hover:opacity-90 text-primary transition-all font-mono text-[10px] rounded-lg"
            title="Перейти в клиентское приложение Календаря"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Calendar className="w-3 h-3 text-primary shrink-0" />
              <span className="font-semibold truncate">{t.toCalendar}</span>
            </div>
            <ExternalLink className="w-2.5 h-2.5 text-primary shrink-0" />
          </a>

          {/* Symmetrical link to Lemon Seasons Feed App */}
          <a
            href={EXTERNAL_APP_URLS.feedApp}
            target="_blank"
            rel="noreferrer"
            className="px-2 py-1 h-6.5 flex items-center justify-between bg-sky-500/10 border border-sky-500/25 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 transition-all font-mono text-[10px] rounded-lg group"
            title="Перейти в умную ленту новостей Lemon Seasons"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Radio className="w-3 h-3 text-sky-500 shrink-0" />
              <span className="font-semibold truncate">{t.feedAppTitle}</span>
            </div>
            <ExternalLink className="w-2.5 h-2.5 text-sky-500/70 group-hover:text-sky-500 shrink-0" />
          </a>
        </div>
      </nav>

      {/* Footer Area */}
      <div className="mt-auto pt-2 border-t border-tile-border flex flex-col gap-1">
        {/* Sync Status Widget in Sidebar */}
        <div className="p-2 rounded-xl bg-tile-subtle border border-tile-border text-[10px] font-mono shadow-xs">
          <div className="flex items-center justify-between text-on-surface mb-0.5">
            <span className="flex items-center gap-1.5 text-[10px]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSyncing ? 'bg-primary animate-pulse' : 'bg-emerald-500'
                }`}
              />
              Obsidian Sync
            </span>
            <span className="text-[9px] text-primary font-mono bg-primary/10 px-1 py-0.2 rounded">v1.8</span>
          </div>
          <p className="text-[10px] text-on-surface-variant truncate">
            {syncData?.counts
              ? t.notesSynced(syncData.counts.notes)
              : t.syncReady}
          </p>
        </div>

        {/* API Docs Link */}
        <a
          href="http://localhost:3001/api/docs"
          target="_blank"
          rel="noreferrer"
          className="px-2 py-0.5 h-5.5 flex items-center justify-between text-on-surface-variant hover:text-on-surface transition-colors font-mono text-[10px] rounded-lg"
        >
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3 h-3 shrink-0" />
            <span>{t.apiDocs}</span>
          </div>
          <ExternalLink className="w-2.5 h-2.5 text-text-muted" />
        </a>
      </div>
    </aside>
  );
};
