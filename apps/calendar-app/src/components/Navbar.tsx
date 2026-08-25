import React from 'react';
import { CalendarViewMode } from '@lenta/shared';
import dayjs from 'dayjs';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Calendar as CalendarIcon,
  Home as HomeIcon,
  ListFilter,
  GanttChartSquare,
  Radio,
  Globe,
  ShieldCheck,
  LogIn,
  LogOut,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { ObsidianLogo } from './ObsidianLogo';

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
  const { t, lang, setLang } = useI18n();
  const { user, isAuthenticated, isAdmin, logout, openAuthModal } = useAuth();
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
            title={t.previousMonth}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-xs font-semibold px-2 text-[#e2e2e2] min-w-[110px] text-center capitalize">
            {currentMonth}
          </span>

          <button
            onClick={onNextMonth}
            className="p-1 rounded text-[#c9c7b2] hover:text-white hover:bg-[#333535] transition-colors"
            title={t.nextMonth}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={onToday}
          className="hidden sm:block text-xs font-mono px-3 py-1.5 rounded bg-[#1e2020] border border-[#242828] text-[#c9c7b2] hover:text-[#e5e971] hover:border-[#c9cd58] transition-colors"
        >
          {t.today}
        </button>
      </div>

      {/* Center: Search Field */}
      <div className="flex-1 max-w-xs md:max-w-md mx-4">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#93927e]" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] focus:ring-1 focus:ring-[#c9cd58] rounded text-xs font-mono pl-8 pr-3 py-1.5 text-[#e2e2e2] placeholder-[#93927e] outline-none transition-all"
          />
        </div>
      </div>

      {/* Right: View Switchers, Language Switcher & Filter Toggle */}
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
            <HomeIcon className="w-3.5 h-3.5" />
            <span>{t.timeline}</span>
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
            <span>{t.calendar}</span>
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
            <span>{t.gantt}</span>
          </button>

          <button
            onClick={() => onSetView('feeds')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
              view === 'feeds'
                ? 'bg-[#c9cd58] text-[#121414] font-semibold shadow-glow-lemon'
                : 'text-[#c9c7b2] hover:text-white hover:bg-[#333535]'
            }`}
            title="Feeds Newsstand & Channel Command Center"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{t.feeds}</span>
          </button>

          <button
            onClick={() => onSetView('obsidian')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
              view === 'obsidian'
                ? 'bg-[#a855f7] text-white font-semibold shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                : 'text-[#c9c7b2] hover:text-[#d8b4fe] hover:bg-[#333535]'
            }`}
            title="Obsidian Containers & 2-Way Vault Sync"
          >
            <ObsidianLogo size={14} />
            <span>Obsidian</span>
          </button>
        </div>


        {/* Admin CMS Direct Launcher (Admin Role Only) */}
        {isAdmin && (
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#ef4444]/15 border border-[#ef4444]/60 text-[#fca5a5] hover:bg-[#ef4444]/25 text-xs font-mono font-semibold transition-all shadow-sm"
            title="Перейти в административную панель Admin CMS"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#ef4444]" />
            <span>Admin CMS</span>
          </a>
        )}

        {/* User Profile & Auth Trigger */}
        {isAuthenticated ? (
          <div className="flex items-center gap-2 pl-1">
            <div className="flex items-center gap-2 bg-[#1e2020] border border-[#242828] py-1 px-2.5 rounded">
              <div className="w-5 h-5 rounded-full bg-[#c9cd58]/30 border border-[#c9cd58] flex items-center justify-center text-[10px] font-bold text-[#e5e971]">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[11px] font-sans font-semibold text-[#e2e2e2] leading-none">
                  {user?.name}
                </span>
                <span className={`text-[9px] font-mono leading-none mt-0.5 ${isAdmin ? 'text-[#ef4444] font-bold' : 'text-[#c9cd58]'}`}>
                  {isAdmin ? t.adminRole : t.memberRole}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title={t.logout}
              className="p-1.5 rounded bg-[#1e2020] border border-[#242828] hover:border-[#ef4444] text-[#93927e] hover:text-[#fca5a5] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => openAuthModal('login')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#c9cd58] text-[#121414] hover:bg-[#dce06b] font-sans font-bold text-xs shadow-glow-lemon transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{t.login}</span>
          </button>
        )}

        {/* Language Switcher Button */}
        <button
          onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
          title={lang === 'ru' ? 'Переключить на английский (English)' : 'Switch to Russian (Русский)'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#1e2020] border border-[#242828] hover:border-[#c9cd58] hover:text-[#e5e971] text-[#c9c7b2] font-mono text-xs font-semibold transition-all"
        >
          <Globe className="w-3.5 h-3.5 text-[#c9cd58]" />
          <span>{lang.toUpperCase()}</span>
        </button>

        {/* Filter Sidebar Toggle Button (Only on Calendar pages) */}
        {['timeline', 'month', 'gantt'].includes(view) && (
          <button
            onClick={onToggleFilter}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-colors relative ${
              isFilterOpen || activeFilterCount > 0
                ? 'bg-[#c9cd58]/10 text-[#e5e971] border-[#c9cd58]'
                : 'bg-[#1e2020] text-[#c9c7b2] border-[#242828] hover:text-white hover:border-[#484837]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t.filters}</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#c9cd58] text-[#121414] text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
};


