import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Globe,
  Calendar,
  Cloud,
  Sun,
  Moon,
  Radio,
} from 'lucide-react';
import { LemonLogo } from './LemonLogo';
import { WorkstationSyncBar } from './WorkstationSyncBar';
import { useAdminI18n } from '../i18n';
import { useAppTheme } from '../theme/ThemeContext';
import { EXTERNAL_APP_URLS } from './sidebar/sidebar.constants';

interface AppTopBarProps {
  globalSearch: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
}

export const AppTopBar: React.FC<AppTopBarProps> = ({
  globalSearch,
  onSearchChange,
  onSearchSubmit,
}) => {
  const { t } = useAdminI18n();
  const { themeMode, toggleTheme } = useAppTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const getPageTitle = () => {
    if (location.pathname.startsWith('/feeds')) return t.feeds;
    if (location.pathname.startsWith('/notes')) return t.allNotes;
    if (location.pathname.startsWith('/taxonomy')) return t.taxonomy;
    if (location.pathname.startsWith('/generators')) return t.generatorLab;
    if (location.pathname.startsWith('/sync')) return t.syncHub;
    return t.dashboard;
  };

  const getPageIcon = () => {
    if (location.pathname.startsWith('/notes')) return 'notes';
    if (location.pathname.startsWith('/feeds')) return 'dynamic_feed';
    if (location.pathname.startsWith('/generators')) return 'science';
    if (location.pathname.startsWith('/sync')) return 'cloud_sync';
    return 'dashboard';
  };

  return (
    <header className="h-11 shrink-0 rounded-2xl bg-panel border border-panel shadow-panel px-3 flex items-center justify-between z-30 transition-all duration-200">
      <div className="flex items-center gap-2 min-w-0">
        <span className="material-symbols-outlined text-primary text-[18px] shrink-0">
          {getPageIcon()}
        </span>
        <h1 className="font-sans font-semibold text-xs text-on-surface tracking-tight truncate">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Global Search */}
        <form onSubmit={onSearchSubmit} className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 group-focus-within:text-primary transition-colors w-3 h-3 pointer-events-none" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="bg-control border border-control-border rounded-lg pl-7 pr-2 h-6.5 text-[10px] font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 w-32 sm:w-44 md:w-52 transition-all"
          />
        </form>

        {/* Language Switcher Button (Disabled - RU only) */}
        <button
          disabled
          className="flex items-center gap-1 h-6.5 px-2 rounded-lg text-[10px] font-mono font-semibold bg-tile-subtle border border-control-border text-on-surface-variant/50 opacity-60 cursor-not-allowed shadow-xs"
          title="Английский язык временно отключен / English is disabled"
        >
          <Globe className="w-3 h-3 shrink-0" />
          <span>RU</span>
        </button>

        {/* Theme Toggle Button (Light / Dark) */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center justify-center h-6.5 w-6.5 rounded-lg text-[10px] font-mono font-semibold bg-control border border-control-border text-on-surface hover:border-primary/40 transition-all cursor-pointer shadow-xs"
          title={themeMode === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
        >
          {themeMode === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-slate-700" />
          )}
        </button>

        {/* Google Drive Sync Bar */}
        <WorkstationSyncBar />

        {/* Open Calendar App Link */}
        <a
          href={EXTERNAL_APP_URLS.calendarApp}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 h-6.5 px-2 rounded-lg text-[10px] font-mono font-semibold bg-primary-container border border-primary-border text-primary hover:opacity-90 transition-all cursor-pointer shadow-xs"
          title="Открыть клиентское приложение Календаря (порт 5174)"
        >
          <Calendar className="w-3 h-3 shrink-0" />
          <span className="hidden sm:inline">{t.toCalendar}</span>
        </a>

        {/* Open Feed App Link */}
        <a
          href={EXTERNAL_APP_URLS.feedApp}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 h-6.5 px-2 rounded-lg text-[10px] font-mono font-semibold bg-sky-500/10 border border-sky-500/25 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-all cursor-pointer shadow-xs"
          title="Открыть умную ленту новостей Lemon Seasons (порт 5175)"
        >
          <Radio className="w-3 h-3 shrink-0 text-sky-500" />
          <span className="hidden sm:inline">{t.toFeed}</span>
        </a>

        <button
          onClick={() => navigate('/sync')}
          className="text-on-surface-variant hover:text-primary transition-colors h-6.5 w-6.5 rounded-lg flex items-center justify-center hover:bg-tile-subtle relative cursor-pointer"
          title={t.syncStatus}
        >
          <Cloud className="w-3.5 h-3.5 shrink-0" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" />
        </button>

        {/* Profile Avatar */}
        <div className="flex items-center gap-1.5 pl-1.5 border-l border-tile-border">
          <div className="px-1.5 py-0.2 rounded-md bg-tile-subtle border border-tile-border text-on-surface font-mono text-[10px] hidden md:inline">
            admin
          </div>
          <LemonLogo size={20} glow={false} />
        </div>
      </div>
    </header>
  );
};
