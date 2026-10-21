import React from 'react';
import {
  Calendar,
  Sparkles,
  Tag,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
  Radio,
} from 'lucide-react';
import dayjs from 'dayjs';
import { FeedSourceMode, UnifiedFeedTab } from '../../adapters/feeds/types';

export interface FeedsSidebarRailProps {
  sourceType?: FeedSourceMode;
  activeFeed?: UnifiedFeedTab | null;
  tabs: UnifiedFeedTab[];
  selectedFeedSlug?: string;
  onSelectFeed: (slug?: string) => void;
  totalNotesCount: number;
  startDate?: string;
  onNavigateToCalendar: () => void;
  onSelectTag?: (tag: string) => void;
  availableTags?: string[];
}

export const FeedsSidebarRail: React.FC<FeedsSidebarRailProps> = ({
  sourceType = 'spark',
  activeFeed,
  tabs,
  selectedFeedSlug,
  onSelectFeed,
  totalNotesCount,
  startDate,
  onNavigateToCalendar,
  onSelectTag,
  availableTags = [],
}) => {
  const currentMonth = dayjs(startDate || undefined).format('MMMM YYYY');
  const isClassic = sourceType === 'classic';
  const isTelegram = sourceType === 'telegram';
  const isDev = sourceType === 'dev';

  const headerCategory = activeFeed
    ? activeFeed.category
    : isDev
    ? 'Dev Hub'
    : isClassic
    ? 'Все события'
    : isTelegram
    ? 'Telegram'
    : 'Все потоки';

  const headerEmoji = activeFeed
    ? activeFeed.emoji
    : isDev
    ? '💻'
    : isClassic
    ? '🏛️'
    : isTelegram
    ? '✈️'
    : '📡';

  const headerTitle = activeFeed
    ? activeFeed.title
    : isDev
    ? 'Dev Hub — Центр разработки'
    : isClassic
    ? 'Все календари и праздники'
    : isTelegram
    ? 'Telegram Web Reader'
    : 'Все каналы Spark';

  const headerDescription = activeFeed
    ? activeFeed.description
    : isDev
    ? 'Инженерные сводки, релизы моделей, changelog обновления вендоров, IT-статьи и кибербезопасность'
    : isClassic
    ? 'Объединенный хронологический поток государственных, религиозных и мировых дат'
    : isTelegram
    ? 'Живой синхронизированный поток внешних каналов по тематическим папкам'
    : 'Объединенный новостной поток всех тематических папок Spark';

  const displayCount = isTelegram ? 624 : (activeFeed ? activeFeed.count : totalNotesCount);
  const categoriesLabel = isDev ? 'тем' : isClassic ? 'тем' : 'папок';
  const widgetTitle = isDev
    ? 'Разделы Dev Hub'
    : isClassic
    ? 'Категории календаря'
    : isTelegram
    ? 'Папки Telegram'
    : 'Папки в Spark';
  const allLabel = isDev ? 'Все Dev ленты' : isClassic ? 'Все события' : isTelegram ? 'Все папки' : 'Все каналы';

  return (
    <aside className="w-72 shrink-0 hidden lg:flex flex-col space-y-3.5 select-none text-xs">
      {/* 1. Active Feed Overview Card */}
      <div className="p-4 rounded-2xl bg-white/95 dark:bg-[#18222d]/95 border border-slate-200/80 dark:border-white/[0.08] shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 dark:text-slate-500">
            О канале / ленте
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#2481cc]/10 text-[#2481cc] font-mono font-semibold">
            {headerCategory}
          </span>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-base shrink-0">
            {headerEmoji}
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-slate-900 dark:text-white truncate leading-tight">
              {headerTitle}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-[#8292a2] mt-0.5 line-clamp-2 leading-relaxed">
              {headerDescription}
            </p>
          </div>
        </div>

        {/* Quick metrics */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06] text-[11px]">
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5">
            <span className="text-slate-400 block text-[10px]">Публикаций</span>
            <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
              {displayCount}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5">
            <span className="text-slate-400 block text-[10px]">Категории</span>
            <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
              {tabs.length} {categoriesLabel}
            </span>
          </div>
        </div>
      </div>

      {/* 1.5 Subtopics Widget (e.g. for Changelogs) */}
      {activeFeed?.subtopics && activeFeed.subtopics.length > 0 && (
        <div className="p-4 rounded-2xl bg-white/95 dark:bg-[#18222d]/95 border border-slate-200/80 dark:border-white/[0.08] shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <span>🏷️</span>
              <span>Подтемы {activeFeed.shortTitle}</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/10 text-slate-500">
              {activeFeed.subtopics.length}
            </span>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onSelectFeed(activeFeed.slug)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-colors duration-150 text-left font-medium ${
                selectedFeedSlug === activeFeed.slug
                  ? 'bg-[#2481cc]/10 text-[#2481cc] font-semibold border border-[#2481cc]/25'
                  : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span>📁</span>
                <span className="truncate">Все {activeFeed.shortTitle}</span>
              </div>
              <span className="font-mono text-[10px] opacity-70">
                {activeFeed.count}
              </span>
            </button>

            {activeFeed.subtopics.map((sub) => {
              const isSubActive = selectedFeedSlug === sub.slug;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSelectFeed(sub.slug)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-colors duration-150 text-left font-medium ${
                    isSubActive
                      ? 'bg-[#2481cc]/10 text-[#2481cc] font-semibold border border-[#2481cc]/25'
                      : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{sub.emoji}</span>
                    <span className="truncate">{sub.title}</span>
                  </div>
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full ${
                    isSubActive
                      ? 'bg-[#2481cc]/20 text-[#2481cc]'
                      : 'bg-slate-100 dark:bg-white/10 opacity-70'
                  }`}>
                    {sub.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Folders / Feeds Navigation Widget */}
      <div className="p-4 rounded-2xl bg-white/95 dark:bg-[#18222d]/95 border border-slate-200/80 dark:border-white/[0.08] shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-[#2481cc]" />
            <span>{widgetTitle}</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {tabs.length}
          </span>
        </div>

        <div className="space-y-1">
          {/* All option */}
          <button
            type="button"
            onClick={() => onSelectFeed(undefined)}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-colors duration-150 text-left font-medium ${
              !selectedFeedSlug
                ? 'bg-[#2481cc]/10 text-[#2481cc]'
                : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <span>{headerEmoji}</span>
              <span className="truncate">{allLabel}</span>
            </div>
            <span className="font-mono text-[10px] opacity-70">
              {displayCount}
            </span>
          </button>

          {/* Individual feeds */}
          {tabs.map((tab) => {
            const isSelected = selectedFeedSlug === tab.slug;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectFeed(tab.slug)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-colors duration-150 text-left font-medium ${
                  isSelected
                    ? 'bg-[#2481cc]/10 text-[#2481cc]'
                    : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span>{tab.emoji}</span>
                  <span className="truncate">{tab.shortTitle}</span>
                </div>
                <span className="font-mono text-[10px] opacity-70">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Jump to Calendar Promotion Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#2481cc]/10 to-indigo-500/10 border border-[#2481cc]/25 shadow-2xs space-y-2">
        <div className="flex items-center gap-2 text-[#2481cc] font-semibold">
          <Calendar className="w-3.5 h-3.5" />
          <span>Календарная сетка</span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
          Просматривайте эти же даты, распределенные по дням в <span className="font-semibold">{currentMonth}</span>.
        </p>
        <button
          type="button"
          onClick={onNavigateToCalendar}
          className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#2481cc] hover:bg-[#1e6cb0] text-white font-medium shadow-xs transition-colors duration-150"
        >
          <span>Открыть месяц</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* 4. Trending Tags */}
      {availableTags.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-[#18222d]/95 border border-slate-200/80 dark:border-white/[0.08] shadow-2xs space-y-2">
          <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px] uppercase font-bold tracking-wider">
            <TrendingUp className="w-3 h-3 text-[#2481cc]" />
            <span>Темы и теги</span>
          </div>

          <div className="flex flex-wrap gap-1">
            {availableTags.slice(0, 8).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onSelectTag?.(t)}
                className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 font-mono text-[10px] transition-colors"
              >
                #{t.replace(/^#/, '')}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
