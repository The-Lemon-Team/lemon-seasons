import React, { useRef, useState, useEffect } from 'react';
import {
  Radio,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  Sun,
  Moon,
  Clock,
} from 'lucide-react';
import dayjs from 'dayjs';
import { FeedTabPill } from './FeedTabPill';
import { MiniCalendar } from '../MiniCalendar';
import { FeedSourceMode, UnifiedFeedTab } from '../../adapters/feeds/types';

export interface FeedsSoftPanelProps {
  // Mode selection: Spark vs Classic vs Telegram
  streamSource: FeedSourceMode;
  onSetStreamSource: (source: FeedSourceMode) => void;

  // Tabs for the active mode
  tabs: UnifiedFeedTab[];
  activeFeedSlug?: string;
  isAllSelected: boolean;
  onSelectFeed: (slug?: string) => void;
  totalNotesCount: number;

  // Search & Date
  searchQuery: string;
  onSearchChange: (q: string) => void;
  startDate?: string;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onSelectMonth?: (year: number, monthIndex: number) => void;
  onSelectDate?: (dateKey: string) => void;
  onToday?: () => void;

  // Actions
  onNavigateToTimeline: () => void;
  onNavigateToCalendar: () => void;

  // Theme control
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const FeedsSoftPanel: React.FC<FeedsSoftPanelProps> = ({
  streamSource,
  onSetStreamSource,
  tabs,
  activeFeedSlug,
  isAllSelected,
  onSelectFeed,
  totalNotesCount,
  searchQuery,
  onSearchChange,
  startDate,
  onPrevMonth,
  onNextMonth,
  onSelectMonth,
  onSelectDate,
  onToday,
  onNavigateToTimeline,
  onNavigateToCalendar,
  isDarkMode,
  onToggleTheme,
}) => {
  const [isMiniCalendarOpen, setIsMiniCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const currentMonth = dayjs(startDate || undefined);

  // Close calendar popover on outside click
  useEffect(() => {
    if (!isMiniCalendarOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setIsMiniCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMiniCalendarOpen]);

  return (
    <div className="shrink-0 w-full rounded-2xl bg-white/95 dark:bg-[#18222d]/95 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] p-3 sm:p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3 transition-colors">
      {/* 1. Top Bar: Title, Source Switcher (Spark vs Classic vs Telegram) & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-white/[0.06]">
        {/* Left: Branding & Segmented Mode Switcher */}
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#2481cc]/10 dark:bg-[#3390ec]/15 border border-[#2481cc]/20 flex items-center justify-center text-[#2481cc] dark:text-[#64b5f6] shrink-0">
              <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
            </div>

            <div>
              <h1 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 leading-none">
                <span>Ленты новостей</span>
                <span className="text-[9px] sm:text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                  Lenta Feeds
                </span>
              </h1>
              <p className="hidden md:block text-[11px] text-slate-500 dark:text-[#8292a2] mt-0.5">
                Компактный дайджест по тематическим направлениям
              </p>
            </div>
          </div>

          {/* Telegram macOS style segmented switcher: Spark vs Classic vs Telegram */}
          <div className="inline-flex p-0.5 rounded-xl bg-slate-100/90 dark:bg-[#131b24] border border-slate-200/60 dark:border-white/5 text-[11px] sm:text-xs font-medium">
            <button
              type="button"
              onClick={() => onSetStreamSource('spark')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors duration-150 flex items-center gap-1 sm:gap-1.5 font-medium ${
                streamSource === 'spark'
                  ? 'bg-white dark:bg-[#243343] text-[#2481cc] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>✨ Spark</span>
            </button>

            <button
              type="button"
              onClick={() => onSetStreamSource('classic')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors duration-150 flex items-center gap-1 sm:gap-1.5 font-medium ${
                streamSource === 'classic'
                  ? 'bg-white dark:bg-[#243343] text-[#2481cc] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🏛️ Classic</span>
            </button>

            <button
              type="button"
              onClick={() => onSetStreamSource('telegram')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors duration-150 flex items-center gap-1 sm:gap-1.5 font-medium ${
                streamSource === 'telegram'
                  ? 'bg-white dark:bg-[#243343] text-[#2481cc] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>✈️ Telegram</span>
              <span className="text-[9px] sm:text-[10px] px-1 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#2481cc] dark:text-blue-300 font-mono font-bold">
                live
              </span>
            </button>
          </div>
        </div>

        {/* Right: Theme Switcher & Navigation Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto shrink-0">
          {/* Light / Dark Mode Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            title={isDarkMode ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
          </button>

          {/* Timeline & Calendar Navigation */}
          <button
            type="button"
            onClick={onNavigateToTimeline}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#243343] dark:hover:bg-[#2d3e52] dark:text-white text-[11px] sm:text-xs font-medium transition-colors"
          >
            <Clock className="w-3 h-3 text-[#2481cc]" />
            <span>Таймлайн</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToCalendar}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-[#2481cc] hover:bg-[#1e6cb0] text-white text-[11px] sm:text-xs font-medium transition-colors shadow-xs"
          >
            <CalendarIcon className="w-3 h-3" />
            <span>Календарь</span>
          </button>
        </div>
      </div>

      {/* 2. Thematic Tabs Row (Spark or Classic) */}
      {streamSource !== 'telegram' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          {/* All Channels Option */}
          <FeedTabPill
            label={streamSource === 'classic' ? 'Все события' : 'Все каналы'}
            emoji={streamSource === 'classic' ? '🏛️' : '📡'}
            count={totalNotesCount}
            isActive={isAllSelected}
            onClick={() => onSelectFeed(undefined)}
          />

          {/* Individual Thematic Feed Tabs */}
          {tabs.map((tab) => {
            const isSelected = activeFeedSlug === tab.slug;
            return (
              <FeedTabPill
                key={tab.id}
                label={tab.shortTitle}
                emoji={tab.emoji}
                count={tab.count}
                isActive={isSelected}
                accentColor={tab.accentColor}
                onClick={() => onSelectFeed(tab.slug)}
                title={`${tab.title}${tab.description ? ` — ${tab.description}` : ''}`}
              />
            );
          })}

          {!isAllSelected && (
            <button
              type="button"
              onClick={() => onSelectFeed(undefined)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              title="Сбросить фильтр"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 3. Search & Period Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0.5">
        {/* Search Field */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              streamSource === 'classic'
                ? 'Поиск по праздникам, памятным датам...'
                : 'Поиск по заметкам, авторам или тегам...'
            }
            className="w-full pl-8 pr-7 py-1.5 rounded-full text-xs bg-slate-100/80 dark:bg-[#131b24] border border-slate-200/70 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-[#2481cc] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Date Month Navigation & Mini-Calendar */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto" ref={calendarRef}>
          {onPrevMonth && (
            <button
              type="button"
              onClick={onPrevMonth}
              className="p-1 rounded-lg border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              title="Предыдущий месяц"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMiniCalendarOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-white/10 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <CalendarIcon className="w-3 h-3 text-[#2481cc]" />
              <span>{currentMonth.format('MMMM YYYY')}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isMiniCalendarOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-72 shadow-2xl rounded-2xl overflow-hidden">
                <MiniCalendar
                  startDate={startDate || currentMonth.format('YYYY-MM-DD')}
                  onSelectMonth={(year, monthIndex) => {
                    onSelectMonth?.(year, monthIndex);
                    setIsMiniCalendarOpen(false);
                  }}
                  onSelectDate={(dateKey) => {
                    onSelectDate?.(dateKey);
                    setIsMiniCalendarOpen(false);
                  }}
                />
              </div>
            )}
          </div>

          {onNextMonth && (
            <button
              type="button"
              onClick={onNextMonth}
              className="p-1 rounded-lg border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              title="Следующий месяц"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {onToday && (
            <button
              type="button"
              onClick={onToday}
              className="px-2 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              Сегодня
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
