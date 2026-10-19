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
    <div className="bg-background text-on-surface font-sans antialiased h-screen w-screen overflow-hidden flex">
      {/* SideNavBar (Matching calendar-app w-64, 256px) */}
      <aside className="bg-[#1e2020] border-r border-[#242828] h-full w-64 flex-shrink-0 flex flex-col py-6 px-4 gap-2 z-50 select-none overflow-y-auto transition-all duration-200 ease-in-out">
        {/* Brand Header */}
        <NavLink
          to="/"
          className="mb-4 flex flex-col gap-1 px-2 py-1.5 rounded-lg hover:bg-[#242828]/60 transition-all group cursor-pointer"
          title={t.dashboard}
        >
          <div className="flex items-center gap-3">
            <LemonLogo size={34} className="transition-transform group-hover:scale-105" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-sans font-bold text-sm text-[#e5e971] tracking-wider uppercase group-hover:text-[#f2f58e] transition-colors">
                  {t.adminTitle}
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#fca5a5] rounded font-bold">
                  CMS
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#c9c7b2] uppercase tracking-widest opacity-80">
                {t.adminTagline}
              </p>
            </div>
          </div>
        </NavLink>

        {/* Quick Add CTA Button (Matching calendar-app CTA size) */}
        <button
          type="button"
          onClick={() => setQuickAddOpen(true)}
          className="bg-[#121414] border border-[#484837] hover:border-[#e5e971] hover:text-[#e5e971] text-[#e2e2e2] font-mono text-xs py-2 px-3 rounded transition-colors flex justify-center items-center gap-2 w-full mb-2 shadow-sm group cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-[#c9cd58] group-hover:rotate-90 transition-transform duration-200" />
          <span>{t.quickAdd}</span>
        </button>

        {/* Primary Navigation Links (Matching calendar-app menu item size & styles) */}
        <nav className="flex flex-col gap-1 flex-1">
          <NavLink
            to="/notes"
            className={({ isActive }) =>
              `px-3 py-2 flex items-center justify-between transition-all duration-200 ease-in-out font-mono text-xs text-left rounded-r ${
                isActive
                  ? 'bg-[#c9cd58]/20 text-[#e5e971] border-l-4 border-[#c9cd58] font-semibold'
                  : 'text-[#c9c7b2] hover:bg-[#333535] hover:text-[#e2e2e2]'
              }`
            }
          >
            <div className="flex items-center gap-3 truncate">
              <FileText className="w-4 h-4 shrink-0" />
              <span className="truncate">{t.allNotes}</span>
            </div>
          </NavLink>

          <NavLink
            to="/feeds"
            className={({ isActive }) =>
              `px-3 py-2 flex items-center justify-between transition-all duration-200 ease-in-out font-mono text-xs text-left rounded-r ${
                isActive
                  ? 'bg-[#c9cd58]/20 text-[#e5e971] border-l-4 border-[#c9cd58] font-semibold'
                  : 'text-[#c9c7b2] hover:bg-[#333535] hover:text-[#e2e2e2]'
              }`
            }
          >
            <div className="flex items-center gap-3 truncate">
              <Rss className="w-4 h-4 shrink-0" />
              <span className="truncate">{t.feeds}</span>
            </div>
          </NavLink>

          <NavLink
            to="/generators"
            className={({ isActive }) =>
              `px-3 py-2 flex items-center justify-between transition-all duration-200 ease-in-out font-mono text-xs text-left rounded-r ${
                isActive
                  ? 'bg-[#c9cd58]/20 text-[#e5e971] border-l-4 border-[#c9cd58] font-semibold'
                  : 'text-[#c9c7b2] hover:bg-[#333535] hover:text-[#e2e2e2]'
              }`
            }
          >
            <div className="flex items-center gap-3 truncate">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">{t.generatorLab}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-400 font-mono font-bold">
              Lab
            </span>
          </NavLink>

          <NavLink
            to="/sync"
            className={({ isActive }) =>
              `px-3 py-2 flex items-center justify-between transition-all duration-200 ease-in-out font-mono text-xs text-left rounded-r ${
                isActive
                  ? 'bg-[#c9cd58]/20 text-[#e5e971] border-l-4 border-[#c9cd58] font-semibold'
                  : 'text-[#c9c7b2] hover:bg-[#333535] hover:text-[#e2e2e2]'
              }`
            }
          >
            <div className="flex items-center gap-3 truncate">
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span className="truncate">{t.syncHub}</span>
            </div>
          </NavLink>

          {/* External Integrations Section */}
          <div className="mt-2 pt-2 border-t border-[#2d3030] flex flex-col gap-1">
            <p className="px-3 mb-1 text-[10px] font-mono uppercase tracking-wider text-[#93927e]/70">
              Внешние сервисы
            </p>
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 flex items-center justify-between text-[#c9c7b2] hover:bg-[#333535] hover:text-[#e2e2e2] transition-all duration-200 font-mono text-xs rounded-r group"
              title="Открыть Defi Chat (http://localhost:3000)"
            >
              <div className="flex items-center gap-3 truncate">
                <Bot className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">Defi Chat</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#93927e] group-hover:text-cyan-400 transition-colors shrink-0" />
            </a>

            {/* Symmetrical link to Calendar App */}
            <a
              href="http://localhost:5174"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 flex items-center justify-between bg-[#c9cd58]/15 border border-[#c9cd58]/40 hover:bg-[#c9cd58]/25 text-[#e5e971] transition-all font-mono text-xs rounded"
              title="Перейти в клиентское приложение Календаря"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-[#c9cd58]" />
                <span className="font-bold">В Календарь</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#e5e971]" />
            </a>
          </div>
        </nav>

        {/* Footer Area */}
        <div className="mt-auto pt-3 border-t border-[#242828] flex flex-col gap-2">
          {/* Sync Status Widget in Sidebar */}
          <div className="p-2.5 rounded-lg bg-[#141616] border border-[#242828] text-xs font-mono">
            <div className="flex items-center justify-between text-[#c9c7b2] mb-1">
              <span className="flex items-center gap-1.5 text-[11px]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSyncing ? 'bg-[#c9cd58] animate-pulse' : 'bg-[#a4d0bf]'
                  }`}
                />
                Obsidian Sync
              </span>
              <span className="text-[10px] text-[#93927e]">v1.0</span>
            </div>
            <p className="text-[11px] text-[#93927e] truncate">
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
            className="px-3 py-2 flex items-center justify-between text-[#c9c7b2] hover:bg-[#333535] hover:text-[#e2e2e2] transition-colors font-mono text-xs rounded-r"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>{t.apiDocs}</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#93927e]" />
          </a>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
        {/* TopAppBar */}
        <header className="flex-shrink-0 z-40 bg-background/80 backdrop-blur-md border-b border-white/5 flex justify-between items-center h-16 px-8">
          <div className="flex items-center gap-4">
            <h1 className="font-sans font-bold text-lg text-primary tracking-tight">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-5">
            {/* Global Search */}
            <form onSubmit={handleSearchSubmit} className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors w-[18px] h-[18px] pointer-events-none" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="bg-surface-container-high border border-outline-variant/50 rounded pl-9 pr-3 py-1.5 text-xs font-sans text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-56 transition-all"
              />
            </form>

            {/* Language Switcher Button (Disabled - RU only) */}
            <button
              disabled
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-surface-container-high border border-outline-variant/40 text-on-surface-variant/50 opacity-60 cursor-not-allowed shadow-sm"
              title="Английский язык временно отключен / English is disabled"
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span>RU</span>
            </button>

            {/* Google Drive Sync Bar */}
            <WorkstationSyncBar />

            {/* Open Calendar App Link */}
            <a
              href="http://localhost:5174"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-semibold bg-[#e5e971]/10 border border-[#e5e971]/40 text-[#e5e971] hover:bg-[#e5e971]/20 transition-all cursor-pointer shadow-sm"
              title="Открыть клиентское приложение Календаря (порт 5174)"
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">В Календарь</span>
            </a>


            <button
              onClick={() => navigate('/sync')}
              className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-white/5 relative cursor-pointer"
              title={t.syncStatus}
            >
              <Cloud className="w-5 h-5 shrink-0" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            </button>

            {/* Profile Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <LemonLogo size={30} glow={false} />
              <span className="font-mono text-xs text-on-surface-variant hidden md:inline">
                admin
              </span>
            </div>
          </div>
        </header>

        {/* Page Content Canvas */}
        <main
          className={`flex-1 w-full min-h-0 ${
            location.pathname === '/notes'
              ? 'p-4 md:px-8 md:py-6 overflow-y-auto lg:overflow-hidden flex flex-col'
              : 'p-6 md:p-8 overflow-y-auto'
          }`}
        >
          <div
            className={`mx-auto w-full max-w-[1440px] ${
              location.pathname === '/notes'
                ? 'flex-1 flex flex-col min-h-0 h-full'
                : 'pb-16'
            }`}
          >
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

