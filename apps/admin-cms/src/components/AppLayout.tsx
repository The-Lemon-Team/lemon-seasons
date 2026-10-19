import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Plus,
  Rss,
  FileText,
  FolderTree,
  Sparkles,
  RefreshCw,
  BookOpen,
  Search,
  Globe,
  Calendar,
  Cloud,
  Bot,
  ExternalLink,
  Sun,
  Moon,
} from 'lucide-react';
import { QuickAddModal } from './QuickAddModal';
import { LemonLogo } from './LemonLogo';
import { WorkstationSyncBar } from './WorkstationSyncBar';
import { ErrorBoundary } from './common/ErrorBoundary';
import { useSyncChanges } from '../api/queries';
import { useAdminI18n } from '../i18n';
import { useAppTheme } from '../theme/ThemeContext';

export const AppLayout: React.FC = () => {
  const { t, lang, setLang } = useAdminI18n();
  const { themeMode, toggleTheme } = useAppTheme();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const { data: syncData, isFetching: isSyncing } = useSyncChanges();

  const getPageTitle = () => {
    if (location.pathname.startsWith('/feeds')) return t.feeds;
    if (location.pathname.startsWith('/notes')) return t.allNotes;
    if (location.pathname.startsWith('/taxonomy')) return t.taxonomy;
    if (location.pathname.startsWith('/generators')) return t.generatorLab;
    if (location.pathname.startsWith('/sync')) return t.syncHub;
    return t.dashboard;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/notes?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  return (
    <div className="bg-platform text-on-surface font-sans antialiased h-screen w-screen overflow-hidden flex p-2 sm:p-2.5 md:p-3 gap-2 sm:gap-2.5 md:gap-3 select-none transition-colors duration-200">
      {/* Detached Floating Sidebar */}
      <aside className="w-52 lg:w-56 h-full shrink-0 rounded-2xl bg-panel border border-panel shadow-panel flex flex-col p-2.5 justify-between z-20 overflow-hidden select-none transition-all duration-200 ease-in-out">
        {/* Brand Header */}
        <NavLink
          to="/"
          className="mb-2 flex flex-col gap-0.5 px-2 py-1 rounded-xl hover:bg-tile-subtle transition-all group cursor-pointer"
          title={t.dashboard}
        >
          <div className="flex items-center gap-2">
            <LemonLogo size={24} className="transition-transform group-hover:scale-105" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-sans font-bold text-[11px] text-primary tracking-wider uppercase group-hover:opacity-80 transition-opacity truncate">
                  {t.adminTitle}
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300 rounded font-bold shrink-0">
                  CMS
                </span>
              </div>
              <p className="text-[9px] font-mono text-on-surface-variant uppercase tracking-widest opacity-80 truncate">
                {t.adminTagline}
              </p>
            </div>
          </div>
        </NavLink>

        {/* Quick Add CTA Button */}
        <button
          type="button"
          onClick={() => setQuickAddOpen(true)}
          className="h-7.5 bg-tile-subtle border border-tile-border hover:border-primary/50 hover:text-primary text-on-surface font-mono text-[11px] px-2.5 rounded-xl transition-all flex justify-center items-center gap-1.5 w-full mb-1.5 shadow-xs group cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-primary group-hover:rotate-90 transition-transform duration-200" />
          <span>{t.quickAdd}</span>
        </button>

        {/* Primary Navigation Links */}
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto no-scrollbar">
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

      {/* Main Container */}
      <div className="flex-1 h-full min-h-0 flex flex-col gap-2 sm:gap-2.5 md:gap-3 overflow-hidden">
        {/* Detached Floating TopAppBar */}
        <header className="h-11 shrink-0 rounded-2xl bg-panel border border-panel shadow-panel px-3 flex items-center justify-between z-10 transition-all duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-primary text-[18px] shrink-0">
              {location.pathname.startsWith('/notes')
                ? 'notes'
                : location.pathname.startsWith('/feeds')
                ? 'dynamic_feed'
                : location.pathname.startsWith('/generators')
                ? 'science'
                : location.pathname.startsWith('/sync')
                ? 'cloud_sync'
                : 'dashboard'}
            </span>
            <h1 className="font-sans font-bold text-xs text-on-surface tracking-tight truncate">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Global Search */}
            <form onSubmit={handleSearchSubmit} className="relative group">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 group-focus-within:text-primary transition-colors w-3 h-3 pointer-events-none" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
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
              href="http://localhost:5174"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 h-6.5 px-2 rounded-lg text-[10px] font-mono font-semibold bg-primary-container border border-primary-border text-primary hover:opacity-90 transition-all cursor-pointer shadow-xs"
              title="Открыть клиентское приложение Календаря (порт 5174)"
            >
              <Calendar className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">В Календарь</span>
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

        {/* Detached Floating Page Content Canvas */}
        <main className="flex-1 h-full min-h-0 overflow-hidden rounded-2xl bg-canvas border border-panel shadow-panel p-2.5 sm:p-3 flex flex-col relative transition-all duration-200">
          <div className="flex-1 min-h-0 h-full w-full flex flex-col overflow-hidden">
            <ErrorBoundary fallbackTitle="Ошибка отображения страницы">
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Global Quick Add Modal */}
      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  );
};

