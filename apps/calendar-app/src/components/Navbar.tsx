import React from 'react';
import { CalendarViewMode } from '@lenta/shared';
import dayjs from 'dayjs';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Calendar as CalendarIcon,
  ListFilter,
  GanttChartSquare,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  startDate: string;
  view: CalendarViewMode;
  search: string;
  isFilterOpen: boolean;
  activeFilterCount: number;
  onSetView: (view: CalendarViewMode) => void;
  onSearchChange: (search: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onToggleFilter: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  startDate,
  view,
  search,
  isFilterOpen,
  activeFilterCount,
  onSetView,
  onSearchChange,
  onPrevMonth,
  onNextMonth,
  onToday,
  onToggleFilter,
}) => {
  const currentMonth = dayjs(startDate).format('MMMM YYYY');

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 h-16 bg-[#121414]/90 backdrop-blur-md border-b border-[#242828] w-full">
      {/* Left: Month Navigation & Today */}
      <div className="flex items-center gap-3">
        {/* Mobile Brand Icon */}
        <div className="flex md:hidden items-center gap-2 mr-2">
          <span className="text-xl">🍋</span>
        </div>

        {/* Month Picker Controls */}
        <div className="flex items-center gap-1 bg-[#1e2020] p-1 rounded border border-[#242828]">
          <button
            onClick={onPrevMonth}
            className="p-1 rounded text-[#c9c7b2] hover:text-white hover:bg-[#333535] transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-xs font-semibold px-2 text-[#e2e2e2] min-w-[110px] text-center">
            {currentMonth}
          </span>

          <button
            onClick={onNextMonth}
            className="p-1 rounded text-[#c9c7b2] hover:text-white hover:bg-[#333535] transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={onToday}
          className="hidden sm:block text-xs font-mono px-3 py-1.5 rounded bg-[#1e2020] border border-[#242828] text-[#c9c7b2] hover:text-[#e5e971] hover:border-[#c9cd58] transition-colors"
        >
          Today
        </button>
      </div>

      {/* Center: Search Field */}
      <div className="flex-1 max-w-xs md:max-w-md mx-4">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#93927e]" />
          <input
            type="text"
            placeholder="Search notes, tags, feeds..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] focus:ring-1 focus:ring-[#c9cd58] rounded text-xs font-mono pl-8 pr-3 py-1.5 text-[#e2e2e2] placeholder-[#93927e] outline-none transition-all"
          />
        </div>
      </div>

      {/* Right: View Switchers & Filter Toggle */}
      <div className="flex items-center gap-2">
        {/* View Mode Toggle Buttons */}
        <div className="hidden sm:flex items-center bg-[#1e2020] p-1 rounded border border-[#242828]">
          <button
            onClick={() => onSetView('timeline')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
              view === 'timeline'
                ? 'bg-[#c9cd58] text-[#121414] font-semibold shadow-glow-lemon'
                : 'text-[#c9c7b2] hover:text-white hover:bg-[#333535]'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </button>

          <button
            onClick={() => onSetView('month')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
              view === 'month'
                ? 'bg-[#c9cd58] text-[#121414] font-semibold shadow-glow-lemon'
                : 'text-[#c9c7b2] hover:text-white hover:bg-[#333535]'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calendar</span>
          </button>

          <button
            onClick={() => onSetView('gantt')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
              view === 'gantt'
                ? 'bg-[#c9cd58] text-[#121414] font-semibold shadow-glow-lemon'
                : 'text-[#c9c7b2] hover:text-white hover:bg-[#333535]'
            }`}
          >
            <GanttChartSquare className="w-3.5 h-3.5" />
            <span>Gantt</span>
          </button>
        </div>

        {/* Filter Sidebar Toggle Button */}
        <button
          onClick={onToggleFilter}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-colors relative ${
            isFilterOpen || activeFilterCount > 0
              ? 'bg-[#c9cd58]/10 text-[#e5e971] border-[#c9cd58]'
              : 'bg-[#1e2020] text-[#c9c7b2] border-[#242828] hover:text-white hover:border-[#484837]'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#c9cd58] text-[#121414] text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
