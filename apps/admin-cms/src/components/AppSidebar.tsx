import React from 'react';
import { NavLink } from 'react-router-dom';
import { Tooltip } from 'antd';
import {
  Plus,
  Rss,
  FileText,
  Sparkles,
  RefreshCw,
  BookOpen,
  Calendar,
  Bot,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
} from 'lucide-react';
import { LemonLogo } from './LemonLogo';
import { useSyncChanges } from '../api/queries';
import { useAdminI18n } from '../i18n';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onOpenQuickAdd: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  collapsed,
  onToggle,
  onOpenQuickAdd,
}) => {
  const { t } = useAdminI18n();
  const { data: syncData, isFetching: isSyncing } = useSyncChanges();

  if (collapsed) {
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

        {/* Expand Button */}
        <Tooltip title="Развернуть меню" placement="right">
          <button
            type="button"
            onClick={onToggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-tile-subtle transition-colors cursor-pointer"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </Tooltip>

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
        <Tooltip title={t.adminTagline} placement="right">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-primary text-on-primary font-semibold shadow-xs'
                  : 'text-on-surface-variant hover:bg-tile-subtle hover:text-on-surface'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4" />
          </NavLink>
        </Tooltip>

        <Tooltip title={t.allNotes} placement="right">
          <NavLink
            to="/notes"
            className={({ isActive }) =>
              `w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-primary text-on-primary font-semibold shadow-xs'
                  : 'text-on-surface-variant hover:bg-tile-subtle hover:text-on-surface'
              }`
            }
          >
            <FileText className="w-4 h-4" />
          </NavLink>
        </Tooltip>

        <Tooltip title={t.feeds} placement="right">
          <NavLink
            to="/feeds"
            className={({ isActive }) =>
              `w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-primary text-on-primary font-semibold shadow-xs'
                  : 'text-on-surface-variant hover:bg-tile-subtle hover:text-on-surface'
              }`
            }
          >
            <Rss className="w-4 h-4" />
          </NavLink>
        </Tooltip>

        <Tooltip title={t.generatorLab} placement="right">
          <NavLink
            to="/generators"
            className={({ isActive }) =>
              `w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-primary text-on-primary font-semibold shadow-xs'
                  : 'text-on-surface-variant hover:bg-tile-subtle hover:text-on-surface'
              }`
            }
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
          </NavLink>
        </Tooltip>

        <Tooltip title={t.syncHub} placement="right">
          <NavLink
            to="/sync"
            className={({ isActive }) =>
              `w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-primary text-on-primary font-semibold shadow-xs'
                  : 'text-on-surface-variant hover:bg-tile-subtle hover:text-on-surface'
              }`
            }
          >
            <RefreshCw className="w-4 h-4" />
          </NavLink>
        </Tooltip>

        <div className="w-6 border-t border-tile-border my-0.5" />

        {/* External Integrations */}
        <Tooltip title="Defi Chat" placement="right">
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-tile-subtle hover:text-cyan-500 transition-colors"
          >
            <Bot className="w-4 h-4" />
          </a>
        </Tooltip>

        <Tooltip title="В Календарь" placement="right">
          <a
            href="http://localhost:5174"
            target="_blank"
            rel="noreferrer"
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-container border border-primary-border text-primary hover:opacity-90 transition-all shadow-xs"
          >
            <Calendar className="w-4 h-4" />
          </a>
        </Tooltip>
      </aside>
    );
  }

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
        <button
          type="button"
          onClick={onToggle}
          className="p-1 rounded-lg hover:bg-tile-subtle text-on-surface-variant hover:text-primary transition-colors cursor-pointer shrink-0"
          title="Свернуть боковую панель"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
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
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `px-2.5 py-1 h-7.5 flex items-center justify-between transition-all duration-150 font-mono text-[11px] rounded-lg ${
              isActive
                ? 'bg-primary text-on-primary font-semibold shadow-xs'
                : 'text-on-surface-variant hover:bg-tile-subtle hover:text-on-surface'
            }`
          }
        >
          <div className="flex items-center gap-2 truncate">
            <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t.adminTagline}</span>
          </div>
        </NavLink>

        <NavLink
          to="/notes"
          className={({ isActive }) =>
            `px-2.5 py-1 h-7.5 flex items-center justify-between transition-all duration-150 font-mono text-[11px] rounded-lg ${
              isActive
                ? 'bg-primary text-on-primary font-semibold shadow-xs'
                : 'text-on-surface-variant hover:bg-tile-subtle hover:text-on-surface'
            }`
          }
        >
          <div className="flex items-center gap-2 truncate">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t.allNotes}</span>
          </div>
        </NavLink>

        <NavLink
          to="/feeds"
          className={({ isActive }) =>
            `px-2.5 py-1 h-7.5 flex items-center justify-between transition-all duration-150 font-mono text-[11px] rounded-lg ${
              isActive
                ? 'bg-primary text-on-primary font-semibold shadow-xs'
                : 'text-on-surface-variant hover:bg-tile-subtle hover:text-on-surface'
            }`
          }
        >
          <div className="flex items-center gap-2 truncate">
            <Rss className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t.feeds}</span>
          </div>
        </NavLink>

        <NavLink
          to="/generators"
          className={({ isActive }) =>
            `px-2.5 py-1 h-7.5 flex items-center justify-between transition-all duration-150 font-mono text-[11px] rounded-lg ${
              isActive
                ? 'bg-primary text-on-primary font-semibold shadow-xs'
                : 'text-on-surface-variant hover:bg-tile-subtle hover:text-on-surface'
            }`
          }
        >
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">{t.generatorLab}</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400 font-mono font-bold">
            Lab
          </span>
        </NavLink>

        <NavLink
          to="/sync"
          className={({ isActive }) =>
            `px-2.5 py-1 h-7.5 flex items-center justify-between transition-all duration-150 font-mono text-[11px] rounded-lg ${
              isActive
                ? 'bg-primary text-on-primary font-semibold shadow-xs'
                : 'text-on-surface-variant hover:bg-tile-subtle hover:text-on-surface'
            }`
          }
        >
          <div className="flex items-center gap-2 truncate">
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t.syncHub}</span>
          </div>
        </NavLink>

        {/* External Integrations Section */}
        <div className="mt-2 pt-2 border-t border-tile-border flex flex-col gap-1">
          <p className="px-2 mb-0.5 text-[9px] font-mono uppercase tracking-wider text-text-muted">
            Внешние сервисы
          </p>
          <a
            href="http://localhost:3000"
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
            href="http://localhost:5174"
            target="_blank"
            rel="noreferrer"
            className="px-2 py-1 h-6.5 flex items-center justify-between bg-primary-container border border-primary-border hover:opacity-90 text-primary transition-all font-mono text-[10px] rounded-lg"
            title="Перейти в клиентское приложение Календаря"
          >
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-primary" />
              <span className="font-semibold">В Календарь</span>
            </div>
            <ExternalLink className="w-2.5 h-2.5 text-primary" />
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
