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
} from 'lucide-react';
import { QuickAddModal } from './QuickAddModal';
import { LemonLogo } from './LemonLogo';
import { WorkstationSyncBar } from './WorkstationSyncBar';
import { ErrorBoundary } from './common/ErrorBoundary';
import { useSyncChanges } from '../api/queries';
import { useAdminI18n } from '../i18n';

export const AppLayout: React.FC = () => {
  const { t, lang, setLang } = useAdminI18n();
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
    <div className="bg-[#07080a] text-on-surface font-sans antialiased h-screen w-screen overflow-hidden flex p-2.5 sm:p-3 md:p-3.5 gap-2.5 sm:gap-3 md:gap-3.5 select-none">
      {/* Detached Floating Sidebar */}
      <aside className="w-56 lg:w-60 h-full shrink-0 rounded-2xl bg-[#14161a]/90 backdrop-blur-xl border border-white/[0.08] shadow-2xl flex flex-col p-3 justify-between z-20 overflow-hidden select-none transition-all duration-200 ease-in-out">
        {/* Brand Header */}
        <NavLink
          to="/"
          className="mb-3 flex flex-col gap-1 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-all group cursor-pointer"
          title={t.dashboard}
        >
          <div className="flex items-center gap-2.5">
            <LemonLogo size={28} className="transition-transform group-hover:scale-105" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-sans font-bold text-xs text-[#e5e971] tracking-wider uppercase group-hover:text-[#f2f58e] transition-colors truncate">
                  {t.adminTitle}
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#fca5a5] rounded font-bold shrink-0">
                  CMS
                </span>
              </div>
              <p className="text-[10px] font-mono text-[#c9c7b2] uppercase tracking-widest opacity-80 truncate">
                {t.adminTagline}
              </p>
            </div>
          </div>
        </NavLink>

        {/* Quick Add CTA Button */}
        <button
          type="button"
          onClick={() => setQuickAddOpen(true)}
          className="h-8 bg-surface-container-high/60 border border-white/[0.08] hover:border-primary/50 hover:text-primary text-[#e2e2e2] font-mono text-xs px-3 rounded-xl transition-all flex justify-center items-center gap-2 w-full mb-2 shadow-xs group cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-[#c9cd58] group-hover:rotate-90 transition-transform duration-200" />
          <span>{t.quickAdd}</span>
        </button>

        {/* Primary Navigation Links */}
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto no-scrollbar">
          <NavLink
            to="/notes"
            className={({ isActive }) =>
              `px-2.5 py-1.5 h-8 flex items-center justify-between transition-all duration-150 font-mono text-xs rounded-xl ${
                isActive
                  ? 'bg-primary text-on-primary font-semibold shadow-[0_0_12px_rgba(201,205,88,0.25)]'
                  : 'text-[#c9c7b2] hover:bg-white/5 hover:text-[#e2e2e2]'
              }`
            }
          >
            <div className="flex items-center gap-2.5 truncate">
              <FileText className="w-4 h-4 shrink-0" />
              <span className="truncate">{t.allNotes}</span>
            </div>
          </NavLink>

          <NavLink
            to="/feeds"
            className={({ isActive }) =>
              `px-2.5 py-1.5 h-8 flex items-center justify-between transition-all duration-150 font-mono text-xs rounded-xl ${
                isActive
                  ? 'bg-primary text-on-primary font-semibold shadow-[0_0_12px_rgba(201,205,88,0.25)]'
                  : 'text-[#c9c7b2] hover:bg-white/5 hover:text-[#e2e2e2]'
              }`
            }
          >
            <div className="flex items-center gap-2.5 truncate">
              <Rss className="w-4 h-4 shrink-0" />
              <span className="truncate">{t.feeds}</span>
            </div>
          </NavLink>

          <NavLink
            to="/generators"
            className={({ isActive }) =>
              `px-2.5 py-1.5 h-8 flex items-center justify-between transition-all duration-150 font-mono text-xs rounded-xl ${
                isActive
                  ? 'bg-primary text-on-primary font-semibold shadow-[0_0_12px_rgba(201,205,88,0.25)]'
                  : 'text-[#c9c7b2] hover:bg-white/5 hover:text-[#e2e2e2]'
              }`
            }
          >
            <div className="flex items-center gap-2.5 truncate">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">{t.generatorLab}</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-400 font-mono font-bold">
              Lab
            </span>
          </NavLink>

          <NavLink
            to="/sync"
            className={({ isActive }) =>
              `px-2.5 py-1.5 h-8 flex items-center justify-between transition-all duration-150 font-mono text-xs rounded-xl ${
                isActive
                  ? 'bg-primary text-on-primary font-semibold shadow-[0_0_12px_rgba(201,205,88,0.25)]'
                  : 'text-[#c9c7b2] hover:bg-white/5 hover:text-[#e2e2e2]'
              }`
            }
          >
            <div className="flex items-center gap-2.5 truncate">
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span className="truncate">{t.syncHub}</span>
            </div>
          </NavLink>

          {/* External Integrations Section */}
          <div className="mt-2 pt-2 border-t border-white/[0.06] flex flex-col gap-1">
            <p className="px-2 mb-0.5 text-[9px] font-mono uppercase tracking-wider text-[#93927e]/70">
              Внешние сервисы
            </p>
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 h-7 flex items-center justify-between text-[#c9c7b2] hover:bg-white/5 hover:text-[#e2e2e2] transition-all font-mono text-xs rounded-lg group"
              title="Открыть Defi Chat (http://localhost:3000)"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Bot className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate text-[11px]">Defi Chat</span>
              </div>
              <ExternalLink className="w-3 h-3 text-[#93927e] group-hover:text-cyan-400 transition-colors shrink-0" />
            </a>

            {/* Symmetrical link to Calendar App */}
            <a
              href="http://localhost:5174"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 h-7 flex items-center justify-between bg-primary-container/20 border border-primary/30 hover:bg-primary-container/30 text-primary-fixed transition-all font-mono text-[11px] rounded-lg"
              title="Перейти в клиентское приложение Календаря"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold">В Календарь</span>
              </div>
              <ExternalLink className="w-3 h-3 text-primary-fixed" />
            </a>
          </div>
        </nav>

        {/* Footer Area */}
        <div className="mt-auto pt-2.5 border-t border-white/[0.06] flex flex-col gap-1.5">
          {/* Sync Status Widget in Sidebar */}
          <div className="p-2 rounded-xl bg-[#0c0e12]/80 border border-white/[0.06] text-xs font-mono">
            <div className="flex items-center justify-between text-[#c9c7b2] mb-0.5">
              <span className="flex items-center gap-1.5 text-[11px]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSyncing ? 'bg-primary animate-pulse' : 'bg-secondary'
                  }`}
                />
                Obsidian Sync
              </span>
              <span className="text-[10px] text-secondary font-mono bg-secondary/10 px-1 py-0.2 rounded">v1.8</span>
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
            className="px-2 py-1 h-6 flex items-center justify-between text-on-surface-variant hover:text-on-surface transition-colors font-mono text-[11px] rounded-lg"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>{t.apiDocs}</span>
            </div>
            <ExternalLink className="w-3 h-3 text-[#93927e]" />
          </a>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 h-full min-h-0 flex flex-col gap-2.5 sm:gap-3 md:gap-3.5 overflow-hidden">
        {/* Detached Floating TopAppBar */}
        <header className="h-12 shrink-0 rounded-2xl bg-[#14161a]/90 backdrop-blur-xl border border-white/[0.08] shadow-lg px-3.5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="material-symbols-outlined text-primary text-[20px] shrink-0">
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
            <h1 className="font-sans font-bold text-sm text-on-surface tracking-tight truncate">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Global Search */}
            <form onSubmit={handleSearchSubmit} className="relative group">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 group-focus-within:text-primary transition-colors w-3.5 h-3.5 pointer-events-none" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="bg-[#0c0e12]/80 border border-white/[0.08] rounded-lg pl-7.5 pr-2.5 h-7 text-[11px] font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 w-36 sm:w-52 md:w-60 transition-all"
              />
            </form>

            {/* Language Switcher Button (Disabled - RU only) */}
            <button
              disabled
              className="flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-mono font-semibold bg-surface-container-high/80 border border-white/[0.06] text-on-surface-variant/50 opacity-60 cursor-not-allowed shadow-xs"
              title="Английский язык временно отключен / English is disabled"
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>RU</span>
            </button>

            {/* Google Drive Sync Bar */}
            <WorkstationSyncBar />

            {/* Open Calendar App Link */}
            <a
              href="http://localhost:5174"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-mono font-semibold bg-primary-container/20 border border-primary/30 text-primary-fixed hover:bg-primary-container/30 transition-all cursor-pointer shadow-xs"
              title="Открыть клиентское приложение Календаря (порт 5174)"
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">В Календарь</span>
            </a>

            <button
              onClick={() => navigate('/sync')}
              className="text-on-surface-variant hover:text-primary transition-colors h-7 w-7 rounded-lg flex items-center justify-center hover:bg-white/5 relative cursor-pointer"
              title={t.syncStatus}
            >
              <Cloud className="w-4 h-4 shrink-0" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
            </button>

            {/* Profile Avatar */}
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-white/[0.08]">
              <div className="px-2 py-0.5 rounded-md bg-surface-container-high/80 border border-white/[0.06] text-on-surface font-mono text-[11px] hidden md:inline">
                admin
              </div>
              <LemonLogo size={24} glow={false} />
            </div>
          </div>
        </header>

        {/* Detached Floating Page Content Canvas */}
        <main className="flex-1 h-full min-h-0 overflow-hidden rounded-2xl bg-[#14161a]/75 backdrop-blur-xl border border-white/[0.08] shadow-xl p-3 sm:p-3.5 flex flex-col relative">
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

