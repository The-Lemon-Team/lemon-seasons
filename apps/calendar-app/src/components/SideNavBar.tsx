import React from 'react';
import { CalendarViewMode } from '@lenta/shared';
import {
  Home,
  Calendar,
  GanttChartSquare,
  Rss,
  Radio,
  Plus,
  ExternalLink,
  SlidersHorizontal,
  FolderLock,
  FolderTree,
  ShieldCheck,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { useObsidianContainers } from '../context/ObsidianContainersContext';
import { useFoldersContext } from '../context/FoldersContext';
import { ObsidianLogo } from './ObsidianLogo';

interface SideNavBarProps {
  currentView: CalendarViewMode;
  onSetView: (view: CalendarViewMode) => void;
  onOpenQuickAdd?: () => void;
  onOpenPrivateContainers?: () => void;
  onToggleFilters: () => void;
  isFilterOpen: boolean;
  activeFilterCount: number;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({
  currentView,
  onSetView,
  onOpenQuickAdd,
  onOpenPrivateContainers,
  onToggleFilters,
  isFilterOpen,
  activeFilterCount,
}) => {
  const { t } = useI18n();
  const { user, role, isAdmin, isAuthenticated, logout, switchDemoRole } = useAuth();
  const { containers } = useObsidianContainers();
  const { folders } = useFoldersContext();


  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#1e2020] border-r border-[#242828] flex flex-col py-6 px-4 gap-2 z-40 hidden md:flex transition-all duration-200 ease-in-out">
      {/* Brand Header */}
      <div className="mb-5 flex flex-col gap-1 px-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c9cd58]/40 to-[#535600]/20 border border-[#c9cd58]/60 flex items-center justify-center text-lg shadow-glow-lemon">
            🍋
          </div>
          <div>
            <span className="font-sans font-bold text-sm text-[#e5e971] tracking-wider uppercase">
              {t.brand}
            </span>
            <p className="text-[11px] font-mono text-[#c9c7b2] uppercase tracking-widest opacity-80">
              {t.brandTagline}
            </p>
          </div>
        </div>
      </div>

      {/* New Entry CTA (For Logged In Users) */}
      <button
        type="button"
        onClick={onOpenQuickAdd}
        className="bg-[#121414] border border-[#484837] hover:border-[#e5e971] hover:text-[#e5e971] text-[#e2e2e2] font-mono text-xs py-2.5 px-4 rounded transition-colors flex justify-center items-center gap-2 w-full mb-3 shadow-sm"
      >
        <Plus className="w-3.5 h-3.5 text-[#c9cd58]" />
        <span>{t.newEntry}</span>
      </button>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-1 flex-1">
        {/* Timeline View */}
        <button
          onClick={() => onSetView('timeline')}
          className={`px-3 py-2 flex items-center gap-3 transition-all duration-200 ease-in-out font-mono text-xs text-left rounded-r ${
            currentView === 'timeline'
              ? 'bg-[#c9cd58]/20 text-[#e5e971] border-l-4 border-[#c9cd58] font-semibold'
              : 'text-[#c9c7b2] hover:bg-[#333535] hover:text-[#e2e2e2]'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>{t.timeline}</span>
        </button>

        {/* Calendar Month View */}
        <button
          onClick={() => onSetView('month')}
          className={`px-3 py-2 flex items-center gap-3 transition-all duration-200 ease-in-out font-mono text-xs text-left rounded-r ${
            currentView === 'month'
              ? 'bg-[#c9cd58]/20 text-[#e5e971] border-l-4 border-[#c9cd58] font-semibold'
              : 'text-[#c9c7b2] hover:bg-[#333535] hover:text-[#e2e2e2]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{t.calendar}</span>
        </button>

        {/* Gantt Swimlane View */}
        <button
          onClick={() => onSetView('gantt')}
          className={`px-3 py-2 flex items-center gap-3 transition-all duration-200 ease-in-out font-mono text-xs text-left rounded-r ${
            currentView === 'gantt'
              ? 'bg-[#c9cd58]/20 text-[#e5e971] border-l-4 border-[#c9cd58] font-semibold'
              : 'text-[#c9c7b2] hover:bg-[#333535] hover:text-[#e2e2e2]'
          }`}
        >
          <GanttChartSquare className="w-4 h-4" />
          <span>{t.gantt}</span>
        </button>

        {/* Feeds & Channels Hub View */}
        <button
          onClick={() => onSetView('feeds')}
          className={`px-3 py-2 flex items-center gap-3 transition-all duration-200 ease-in-out font-mono text-xs text-left rounded-r ${
            currentView === 'feeds'
              ? 'bg-[#c9cd58]/20 text-[#e5e971] border-l-4 border-[#c9cd58] font-semibold'
              : 'text-[#c9c7b2] hover:bg-[#333535] hover:text-[#e2e2e2]'
          }`}
        >
          <Radio className="w-4 h-4 text-[#c9cd58]" />
          <span>{t.feeds}</span>
        </button>

        {/* Folder Manager View */}
        <button
          onClick={() => onSetView('folders')}
          className={`px-3 py-2 flex items-center justify-between transition-all duration-200 ease-in-out font-mono text-xs rounded-r ${
            currentView === 'folders'
              ? 'bg-[#c9cd58]/20 text-[#e5e971] border-l-4 border-[#c9cd58] font-semibold shadow-glow-lemon'
              : 'text-[#c9c7b2] hover:bg-[#333535] hover:text-[#e2e2e2]'
          }`}
        >
          <div className="flex items-center gap-3">
            <FolderTree className="w-4 h-4 text-[#c9cd58]" />
            <span>{t.folders}</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
            currentView === 'folders'
              ? 'bg-[#c9cd58] text-[#121414]'
              : 'bg-[#c9cd58]/15 text-[#e5e971]'
          }`}>
            {folders.length}
          </span>
        </button>

        {/* Obsidian Containers View */}
        <button
          onClick={() => onSetView('obsidian')}
          className={`px-3 py-2 flex items-center justify-between transition-all duration-200 ease-in-out font-mono text-xs rounded-r ${
            currentView === 'obsidian'
              ? 'bg-[#a855f7]/20 text-[#d8b4fe] border-l-4 border-[#a855f7] font-semibold shadow-[0_0_15px_rgba(168,85,247,0.15)]'
              : 'text-[#c9c7b2] hover:bg-[#333535] hover:text-[#e2e2e2]'
          }`}
        >
          <div className="flex items-center gap-3">
            <ObsidianLogo size={16} glow={currentView === 'obsidian'} />
            <span className={currentView === 'obsidian' ? 'text-[#f3e8ff]' : ''}>
              {t.obsidianHub}
            </span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
            currentView === 'obsidian'
              ? 'bg-[#a855f7] text-white'
              : 'bg-[#a855f7]/15 text-[#d8b4fe]'
          }`}>
            {containers.length}
          </span>
        </button>


        {/* Feeds & Filter Toggle */}
        <button
          onClick={onToggleFilters}
          className={`px-3 py-2 flex items-center justify-between transition-all duration-200 ease-in-out font-mono text-xs text-left rounded-r ${
            isFilterOpen || activeFilterCount > 0
              ? 'bg-[#444747]/40 text-[#e5e971]'
              : 'text-[#c9c7b2] hover:bg-[#333535] hover:text-[#e2e2e2]'
          }`}
        >
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="w-4 h-4 text-[#c9cd58]" />
            <span>{t.feedsAndTags}</span>
          </div>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#c9cd58] text-[#121414] text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* ADMIN ONLY: Link to Admin CMS */}
        {isAdmin && (
          <div className="mt-2 pt-2 border-t border-[#2d3030]">
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2.5 flex items-center justify-between bg-[#ef4444]/15 border border-[#ef4444]/40 hover:bg-[#ef4444]/25 text-[#fca5a5] transition-all font-mono text-xs rounded"
              title="Перейти в систему управления контентом Admin CMS"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#ef4444]" />
                <span className="font-bold">{t.adminCms}</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#fca5a5]" />
            </a>
          </div>
        )}
      </nav>

      {/* User Session Profile & Role Switcher */}
      {isAuthenticated && (
        <div className="mt-auto pt-3 border-t border-[#242828] flex flex-col gap-2">
          <div className="p-2.5 rounded-lg bg-[#141616] border border-[#242828] flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-[#c9cd58]/20 border border-[#c9cd58] flex items-center justify-center text-xs font-bold text-[#e5e971] shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-sans font-semibold text-[#e2e2e2] truncate">
                  {user?.name}
                </span>
                <span className={`text-[10px] font-mono truncate ${isAdmin ? 'text-[#ef4444] font-bold' : 'text-[#c9cd58]'}`}>
                  {isAdmin ? 'Администратор' : 'Участник (Member)'}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title={t.logout}
              className="p-1.5 rounded hover:bg-[#242828] text-[#93927e] hover:text-[#fca5a5] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Role Test Switcher Buttons */}
          <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
            <button
              onClick={() => switchDemoRole('guest')}
              className="flex-1 py-1 rounded bg-[#141616] hover:bg-[#242828] text-[#93927e] hover:text-white text-center transition-colors"
              title="Переключиться на гостя"
            >
              Гость
            </button>
            <button
              onClick={() => switchDemoRole('user')}
              className={`flex-1 py-1 rounded text-center transition-colors ${
                role === 'user' ? 'bg-[#c9cd58]/20 text-[#e5e971] font-bold' : 'bg-[#141616] hover:bg-[#242828] text-[#93927e]'
              }`}
              title="Переключиться на участника"
            >
              Участник
            </button>
            <button
              onClick={() => switchDemoRole('admin')}
              className={`flex-1 py-1 rounded text-center transition-colors ${
                role === 'admin' ? 'bg-[#ef4444]/20 text-[#fca5a5] font-bold' : 'bg-[#141616] hover:bg-[#242828] text-[#93927e]'
              }`}
              title="Переключиться на админа"
            >
              Админ
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
