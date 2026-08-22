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
} from 'lucide-react';
import { useI18n } from '../i18n';

interface SideNavBarProps {
  currentView: CalendarViewMode;
  onSetView: (view: CalendarViewMode) => void;
  onOpenQuickAdd?: () => void;
  onToggleFilters: () => void;
  isFilterOpen: boolean;
  activeFilterCount: number;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({
  currentView,
  onSetView,
  onOpenQuickAdd,
  onToggleFilters,
  isFilterOpen,
  activeFilterCount,
}) => {
  const { t } = useI18n();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#1e2020] border-r border-[#242828] flex flex-col py-6 px-4 gap-2 z-40 hidden md:flex transition-all duration-200 ease-in-out">
      {/* Brand Header */}
      <div className="mb-6 flex flex-col gap-1 px-2">
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

      {/* New Entry CTA */}
      <a
        href="http://localhost:5173/notes/new"
        target="_blank"
        rel="noreferrer"
        className="bg-[#121414] border border-[#484837] hover:border-[#e5e971] hover:text-[#e5e971] text-[#e2e2e2] font-mono text-xs py-2.5 px-4 rounded transition-colors flex justify-center items-center gap-2 w-full mb-3"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>{t.newEntry}</span>
      </a>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-1 flex-1">
        {/* Timeline View */}
        <button
          onClick={() => onSetView('timeline')}
          className={`px-3 py-2.5 flex items-center gap-3 transition-all duration-200 ease-in-out font-mono text-xs text-left rounded-r ${
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
          className={`px-3 py-2.5 flex items-center gap-3 transition-all duration-200 ease-in-out font-mono text-xs text-left rounded-r ${
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
          className={`px-3 py-2.5 flex items-center gap-3 transition-all duration-200 ease-in-out font-mono text-xs text-left rounded-r ${
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
          className={`px-3 py-2.5 flex items-center gap-3 transition-all duration-200 ease-in-out font-mono text-xs text-left rounded-r ${
            currentView === 'feeds'
              ? 'bg-[#c9cd58]/20 text-[#e5e971] border-l-4 border-[#c9cd58] font-semibold'
              : 'text-[#c9c7b2] hover:bg-[#333535] hover:text-[#e2e2e2]'
          }`}
        >
          <Radio className="w-4 h-4 text-[#c9cd58]" />
          <span>{t.feeds}</span>
        </button>

        {/* Feeds & Filter Toggle */}
        <button
          onClick={onToggleFilters}
          className={`px-3 py-2.5 flex items-center justify-between transition-all duration-200 ease-in-out font-mono text-xs text-left rounded-r ${
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

        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noreferrer"
          className="px-3 py-2.5 flex items-center justify-between text-[#c9c7b2] hover:bg-[#333535] hover:text-[#e2e2e2] transition-all font-mono text-xs rounded-r"
        >
          <div className="flex items-center gap-3">
            <Rss className="w-4 h-4" />
            <span>{t.adminCms}</span>
          </div>
          <ExternalLink className="w-3 h-3 text-[#c9cd58]" />
        </a>
      </nav>

      {/* Footer Meta: Copyright & Lemon Team */}
      <div className="mt-auto pt-3 border-t border-[#242828] flex flex-col gap-1 text-[11px] font-mono text-[#93927e] px-2">
        <div className="flex items-center justify-between">
          <span className="text-[#e5e971] font-semibold tracking-wider uppercase text-[10px]">Lemon Seasons</span>
          <span className="text-xs">🍋</span>
        </div>
        <div className="text-[10px] text-[#76786b] flex items-center justify-between">
          <span>© 2026 The Lemon Team</span>
          <span className="text-[9px] uppercase tracking-wider text-[#93927e]/70">Lenta</span>
        </div>
      </div>
    </aside>
  );
};
