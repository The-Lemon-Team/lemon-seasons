import React, { useState } from 'react';
import { CalendarViewMode, Note } from '@lenta/shared';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { PUBLIC_FEED_PRESETS, PRESET_SAMPLE_NOTES } from '../constants/presets';
import { TimelineView } from './TimelineView';
import { MonthGridView } from './MonthGridView';
import { GanttView } from './GanttView';
import { NoteDetailModal } from './NoteDetailModal';
import { ObsidianLogo } from './ObsidianLogo';
import {
  ListFilter,
  Calendar as CalendarIcon,
  GanttChartSquare,
  ChevronLeft,
  ChevronRight,
  Globe,
  LogIn,
  UserPlus,
  Sparkles,
  Shield,
  Layers,
  ArrowRight,
  Radio,
  Clock,
  Tag,
  FolderLock,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import dayjs from 'dayjs';

export const LandingPage: React.FC = () => {
  const { t, lang, setLang } = useI18n();
  const { openAuthModal, switchDemoRole } = useAuth();


  // Widget state
  const [selectedPresetSlug, setSelectedPresetSlug] = useState<string>('russian-holidays');
  const [widgetView, setWidgetView] = useState<CalendarViewMode>('timeline');
  const [currentDate, setCurrentDate] = useState<string>('2026-08-01');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const activePreset =
    PUBLIC_FEED_PRESETS.find((p) => p.slug === selectedPresetSlug) || PUBLIC_FEED_PRESETS[0];

  const presetNotes = PRESET_SAMPLE_NOTES[selectedPresetSlug] || [];

  const handlePrevMonth = () => {
    setCurrentDate((prev) => dayjs(prev).subtract(1, 'month').format('YYYY-MM-DD'));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => dayjs(prev).add(1, 'month').format('YYYY-MM-DD'));
  };

  const handleToday = () => {
    setCurrentDate('2026-08-01'); // Project anchor
  };

  const currentMonthLabel = dayjs(currentDate).format('MMMM YYYY');

  // Dummy filter state for child components
  const dummyFilterState = {
    start: dayjs(currentDate).startOf('month').toISOString(),
    end: dayjs(currentDate).endOf('month').toISOString(),
    view: widgetView,
    tags: [],
    hashtags: [],
    types: [],
    search: '',
  };

  return (
    <div className="min-h-screen bg-[#121414] text-[#e2e2e2] flex flex-col selection:bg-[#c9cd58]/30 selection:text-[#e5e971]">
      {/* 1. Public Landing Top Navigation */}
      <header className="sticky top-0 z-40 w-full bg-[#121414]/90 backdrop-blur-md border-b border-[#242828] px-4 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c9cd58]/30 to-[#484837]/20 border border-[#c9cd58]/60 flex items-center justify-center text-xl shadow-glow-lemon">
            🍋
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans font-bold text-sm tracking-wider uppercase text-[#e5e971]">
                Lemon Calendarium
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#c9cd58]/10 text-[#c9cd58] border border-[#c9cd58]/30">
                Public
              </span>
            </div>
            <p className="text-[10px] font-mono text-[#93927e] uppercase tracking-widest hidden sm:block">
              {t.brandTagline}
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2.5">
          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1e2020] border border-[#242828] hover:border-[#c9cd58] text-[#c9c7b2] font-mono text-xs font-semibold transition-all"
            title={lang === 'ru' ? 'English' : 'Русский'}
          >
            <Globe className="w-3.5 h-3.5 text-[#c9cd58]" />
            <span>{lang.toUpperCase()}</span>
          </button>

          {/* Quick Demo Switcher (Instant Member Login) */}
          <button
            onClick={() => switchDemoRole('user')}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1e2020] border border-[#383a3a] hover:border-[#c9cd58] text-[#c9cd58] text-xs font-mono font-medium transition-all"
            title="Быстрый вход в рабочую зону участника"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Демо-вход</span>
          </button>

          {/* Obsidian Connection Quick Link */}
          <button
            onClick={() => switchDemoRole('user')}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#241738] border border-[#8b5cf6]/50 hover:border-[#a855f7] text-[#d8b4fe] hover:text-white text-xs font-mono font-medium transition-all shadow-[0_0_10px_rgba(168,85,247,0.2)]"
            title="Перейти к Obsidian контейнерам"
          >
            <ObsidianLogo size={14} glow />
            <span>Obsidian Connection</span>
          </button>


          {/* Sign In Button */}
          <button
            onClick={() => openAuthModal('login')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#1e2020] border border-[#242828] hover:border-[#c9cd58] text-[#e2e2e2] hover:text-[#e5e971] text-xs font-mono font-semibold transition-all"
          >
            <LogIn className="w-3.5 h-3.5 text-[#c9cd58]" />
            <span>{t.login}</span>
          </button>

          {/* Register Button */}
          <button
            onClick={() => openAuthModal('register')}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[#c9cd58] hover:bg-[#dce06b] text-[#121414] text-xs font-sans font-bold shadow-glow-lemon transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{t.register}</span>
          </button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative px-4 lg:px-8 pt-12 pb-8 max-w-6xl mx-auto w-full text-center flex flex-col items-center">
        {/* Glow ambient background element */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#c9cd58]/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e2020] border border-[#c9cd58]/40 text-[#e5e971] font-mono text-xs mb-4 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-[#c9cd58] animate-pulse" />
          <span>{t.landingHeroBadge}</span>
        </div>

        <h1 className="font-sans font-extrabold text-3xl sm:text-5xl text-[#e5e971] tracking-tight max-w-3xl leading-tight mb-4">
          {t.landingHeroTitle}
        </h1>

        <p className="font-sans text-sm sm:text-base text-[#c9c7b2] max-w-2xl leading-relaxed mb-6">
          {t.landingHeroSubtitle}
        </p>

        {/* Hero Quick Auth CTA */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <button
            onClick={() => openAuthModal('register')}
            className="px-6 py-2.5 rounded-lg bg-[#c9cd58] hover:bg-[#dce06b] text-[#121414] font-sans font-bold text-xs sm:text-sm shadow-glow-lemon transition-all flex items-center gap-2"
          >
            <span>Начать бесплатно</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => switchDemoRole('user')}
            className="px-5 py-2.5 rounded-lg bg-[#1e2020] border border-[#2d3030] hover:border-[#c9cd58] text-[#c9cd58] font-mono font-medium text-xs sm:text-sm transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Войти как Участник</span>
          </button>
          <button
            onClick={() => switchDemoRole('admin')}
            className="px-4 py-2.5 rounded-lg bg-[#1e2020] border border-[#ef4444]/40 hover:border-[#ef4444] text-[#fca5a5] font-mono font-medium text-xs transition-all flex items-center gap-2"
          >
            <Shield className="w-3.5 h-3.5 text-[#ef4444]" />
            <span>Демо Администратор</span>
          </button>
        </div>
      </section>

      {/* 3. Curated Public Preset Single-Selection Bar */}
      <section className="px-4 lg:px-8 max-w-6xl mx-auto w-full mb-6">
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center justify-between">
            <h2 className="font-sans font-bold text-base text-[#e5e971] flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#c9cd58]" />
              <span>{t.landingPresetsTitle}</span>
            </h2>
            <span className="text-[11px] font-mono text-[#93927e]">
              Выбран 1 активный фильтр
            </span>
          </div>
          <p className="text-xs text-[#93927e]">
            {t.landingPresetsSubtitle}
          </p>
        </div>

        {/* 4 Single-Select Presets Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PUBLIC_FEED_PRESETS.map((preset) => {
            const isSelected = selectedPresetSlug === preset.slug;
            return (
              <button
                key={preset.id}
                onClick={() => setSelectedPresetSlug(preset.slug)}
                className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between relative overflow-hidden group ${
                  isSelected
                    ? 'bg-[#1e2020] border-[#c9cd58] shadow-glow-lemon ring-1 ring-[#c9cd58]/40'
                    : 'bg-[#181a1a] border-[#242828] hover:border-[#484837] hover:bg-[#1a1c1c]'
                }`}
              >
                {/* Active Indicator Pin */}
                {isSelected && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-mono font-bold text-[#c9cd58] bg-[#c9cd58]/10 px-2 py-0.5 rounded-full border border-[#c9cd58]/30">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Активен</span>
                  </div>
                )}

                <div>
                  <div className="text-2xl mb-2">{preset.icon}</div>
                  <h3
                    className={`font-sans font-bold text-sm mb-1 ${
                      isSelected ? 'text-[#e5e971]' : 'text-[#e2e2e2] group-hover:text-[#e5e971]'
                    }`}
                  >
                    {preset.title}
                  </h3>
                  <p className="text-[11px] text-[#93927e] line-clamp-2 leading-snug mb-3">
                    {preset.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#242828] text-[10px] font-mono text-[#93927e]">
                  <span>{preset.category}</span>
                  <span className="text-[#c9cd58] font-bold">
                    {preset.count || presetNotes.length} событий
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Interactive Live Widget Container */}
      <section className="px-4 lg:px-8 max-w-6xl mx-auto w-full mb-16">
        <div className="bg-[#181a1a] border border-[#2d3030] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Widget Control Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-[#141616] border-b border-[#242828]">
            {/* Left: Active Preset Title & Month Navigation */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{activePreset.icon}</span>
                <span className="font-sans font-bold text-xs sm:text-sm text-[#e5e971]">
                  {activePreset.title}
                </span>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center gap-1 bg-[#1e2020] p-1 rounded-md border border-[#242828]">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 rounded text-[#c9c7b2] hover:text-white hover:bg-[#333] transition-colors"
                  title={t.previousMonth}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-xs font-semibold px-2 text-[#e2e2e2] min-w-[100px] text-center capitalize">
                  {currentMonthLabel}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-1 rounded text-[#c9c7b2] hover:text-white hover:bg-[#333] transition-colors"
                  title={t.nextMonth}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleToday}
                className="hidden sm:block text-[11px] font-mono px-2.5 py-1 rounded bg-[#1e2020] border border-[#242828] text-[#c9c7b2] hover:text-[#e5e971] hover:border-[#c9cd58] transition-colors"
              >
                {t.today}
              </button>
            </div>

            {/* Right: Calendar Type Switcher */}
            <div className="flex items-center gap-1 bg-[#1e2020] p-1 rounded-md border border-[#242828]">
              <button
                onClick={() => setWidgetView('timeline')}
                className={`px-3 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
                  widgetView === 'timeline'
                    ? 'bg-[#c9cd58] text-[#121414] font-bold shadow-glow-lemon'
                    : 'text-[#c9c7b2] hover:text-white hover:bg-[#333]'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>{t.timeline}</span>
              </button>

              <button
                onClick={() => setWidgetView('month')}
                className={`px-3 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
                  widgetView === 'month'
                    ? 'bg-[#c9cd58] text-[#121414] font-bold shadow-glow-lemon'
                    : 'text-[#c9c7b2] hover:text-white hover:bg-[#333]'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>{t.calendar}</span>
              </button>

              <button
                onClick={() => setWidgetView('gantt')}
                className={`px-3 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
                  widgetView === 'gantt'
                    ? 'bg-[#c9cd58] text-[#121414] font-bold shadow-glow-lemon'
                    : 'text-[#c9c7b2] hover:text-white hover:bg-[#333]'
                }`}
              >
                <GanttChartSquare className="w-3.5 h-3.5" />
                <span>{t.gantt}</span>
              </button>
            </div>
          </div>

          {/* Widget Content Canvas */}
          <div className="h-[520px] relative overflow-hidden bg-[#121414]">
            {widgetView === 'timeline' && (
              <TimelineView
                notes={presetNotes}
                isLoading={false}
                onSelectNote={setSelectedNote}
                filterState={dummyFilterState}
                onToggleFeed={() => {}}
                onSelectOnlyFeed={() => {}}
                onClearFeeds={() => {}}
                onOpenFeedsHub={() => {}}
                onToggleType={() => {}}
                onSelectOnlyType={() => {}}
                onClearTypes={() => {}}
                onToggleTag={() => {}}
                onSelectOnlyTag={() => {}}
                onClearTags={() => {}}
                onResetFilters={() => {}}
              />
            )}

            {widgetView === 'month' && (
              <MonthGridView
                notes={presetNotes}
                startDate={currentDate}
                filterState={dummyFilterState}
                onSelectNote={setSelectedNote}
                onSelectDay={(dateKey) => {
                  setCurrentDate(dateKey);
                  setWidgetView('timeline');
                }}
                onToggleFeed={() => {}}
                onSelectOnlyFeed={() => {}}
                onClearFeeds={() => {}}
                onOpenFeedsHub={() => {}}
                onToggleType={() => {}}
                onSelectOnlyType={() => {}}
                onClearTypes={() => {}}
                onToggleTag={() => {}}
                onSelectOnlyTag={() => {}}
                onClearTags={() => {}}
                onToggleHashtag={() => {}}
                onResetFilters={() => {}}
                onOpenFilterDrawer={() => {}}
              />
            )}

            {widgetView === 'gantt' && (
              <GanttView
                notes={presetNotes}
                startDate={dummyFilterState.start}
                endDate={dummyFilterState.end}
                isLoading={false}
                onSelectNote={setSelectedNote}
              />
            )}
          </div>

          {/* Widget Bottom Info Bar */}
          <div className="px-6 py-3 bg-[#141616] border-t border-[#242828] flex flex-wrap items-center justify-between text-xs font-mono text-[#93927e]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#c9cd58]" />
              <span>
                Отображается: <strong>{presetNotes.length}</strong> событий ленты «{activePreset.title}»
              </span>
            </div>
            <button
              onClick={() => openAuthModal('register')}
              className="text-[#c9cd58] hover:underline flex items-center gap-1 font-semibold"
            >
              <span>{t.guestNotice}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. Dedicated "Obsidian Connection!" Showcase Section */}
      <section className="px-4 lg:px-8 max-w-6xl mx-auto w-full mb-16">
        <div className="relative rounded-3xl bg-gradient-to-b from-[#1c1427] via-[#16131c] to-[#121414] border border-[#8b5cf6]/40 p-6 sm:p-10 shadow-[0_0_50px_rgba(139,92,246,0.15)] overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#a855f7]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#c9cd58]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left Content */}
            <div className="flex-1 flex flex-col items-start text-left">
              {/* Badge with Obsidian Logo */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#2a1b3d] border border-[#a855f7]/50 text-[#d8b4fe] font-mono text-xs mb-4 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
                <ObsidianLogo size={16} glow />
                <span className="font-bold tracking-wide">Obsidian Connection!</span>
              </div>

              <h2 className="font-sans font-extrabold text-2xl sm:text-4xl text-[#f3e8ff] tracking-tight leading-tight mb-3">
                Бесшовная интеграция с вашим хранилищем Obsidian
              </h2>

              <p className="text-sm text-[#c9c7b2] leading-relaxed mb-6 max-w-xl">
                Подключайте локальные папки Markdown в один клик. Создавайте <strong>приватные контейнеры</strong> для личных дневников или <strong>публичные</strong> для общих релизов с автоматическим распознаванием дат и тегов.
              </p>

              {/* 3 Key Capabilities Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-8">
                <div className="p-3 rounded-xl bg-[#121414]/70 border border-[#242828] flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#a855f7]/20 flex items-center justify-center shrink-0 text-[#d8b4fe]">
                    <FolderLock className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-xs text-[#f3e8ff] block">Private & Public</span>
                    <span className="text-[10px] text-[#93927e]">Изоляция по токену</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#121414]/70 border border-[#242828] flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#c9cd58]/20 flex items-center justify-center shrink-0 text-[#e5e971]">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-xs text-[#e5e971] block">Наблюдение папок</span>
                    <span className="text-[10px] text-[#93927e]">Observed Folders</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#121414]/70 border border-[#242828] flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#3b82f6]/20 flex items-center justify-center shrink-0 text-[#60a5fa]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-xs text-[#93c5fd] block">Delta Sync</span>
                    <span className="text-[10px] text-[#93927e]">2-сторонняя связь</span>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => switchDemoRole('user')}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#a855f7] to-[#8b5cf6] hover:from-[#b76eff] hover:to-[#9d6efc] text-white font-sans font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all flex items-center gap-2"
                >
                  <ObsidianLogo size={18} />
                  <span>Открыть контейнеры Obsidian</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => openAuthModal('register')}
                  className="px-4 py-2.5 rounded-xl bg-[#1e2020] border border-[#2d3030] hover:border-[#a855f7] text-[#c9c7b2] hover:text-[#f3e8ff] font-mono text-xs transition-all"
                >
                  <span>Создать аккаунт</span>
                </button>
              </div>
            </div>

            {/* Right Interactive Preview Card */}
            <div className="w-full lg:w-[420px] bg-[#141616]/90 border border-[#8b5cf6]/30 rounded-2xl p-5 shadow-2xl backdrop-blur-md flex flex-col gap-3.5 shrink-0">
              <div className="flex items-center justify-between pb-3 border-b border-[#242828]">
                <div className="flex items-center gap-2">
                  <ObsidianLogo size={20} glow />
                  <span className="font-mono text-xs font-bold text-[#f3e8ff]">
                    Obsidian Vault Connection
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                  <span>Ready</span>
                </span>
              </div>

              {/* Sample Container Box */}
              <div className="p-3 rounded-xl bg-[#1a1424] border border-[#8b5cf6]/40 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#f3e8ff]">
                    🔒 Personal Journal & Vault
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#a855f7]/20 text-[#d8b4fe] font-mono text-[9px] font-semibold border border-[#a855f7]/30">
                    Private
                  </span>
                </div>
                <p className="font-mono text-[10px] text-[#93927e]">
                  Путь: Vault/Personal • 42 заметки
                </p>

                {/* Observed Folders preview chips */}
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="px-2 py-0.5 rounded bg-[#121414] border border-[#242828] text-[10px] font-mono text-[#c9cd58]">
                    📁 01_Daily_Logs (Рекурсивно)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#121414] border border-[#242828] text-[10px] font-mono text-[#d8b4fe]">
                    📁 02_Projects
                  </span>
                </div>
              </div>

              {/* Simulated Token Preview */}
              <div className="flex flex-col gap-1 text-[11px] font-mono">
                <span className="text-[#93927e] text-[10px]">Companion API Secret Token:</span>
                <div className="bg-[#101212] p-2 rounded-lg border border-[#242828] text-[10px] text-[#a855f7] select-all truncate">
                  lenta_jwt_sec_obsidian_vault_token_2026_***
                </div>
              </div>

              {/* Instant Connect Demo Button */}
              <button
                onClick={() => switchDemoRole('user')}
                className="w-full py-2 rounded-lg bg-[#a855f7]/20 hover:bg-[#a855f7]/30 border border-[#a855f7]/50 text-[#d8b4fe] hover:text-white font-mono text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#c9cd58]" />
                <span>Протестировать в Демо-режиме</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Features & Privacy Model Section */}
      <section className="px-4 lg:px-8 max-w-6xl mx-auto w-full mb-16">
        <div className="text-center mb-10">
          <h2 className="font-sans font-extrabold text-2xl sm:text-3xl text-[#e5e971] mb-2">
            {t.landingFeaturesTitle}
          </h2>
          <p className="text-xs sm:text-sm text-[#93927e] max-w-xl mx-auto">
            {t.landingFeaturesSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: 3 Privacy Tiers */}
          <div className="p-6 rounded-xl bg-[#181a1a] border border-[#242828] flex flex-col gap-3 relative group hover:border-[#c9cd58]/40 transition-all">
            <div className="w-10 h-10 rounded-lg bg-[#c9cd58]/20 border border-[#c9cd58]/40 flex items-center justify-center text-lg text-[#c9cd58]">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-sans font-bold text-sm text-[#e5e971]">
              {t.landingFeaturePrivacyTitle}
            </h3>
            <p className="text-xs text-[#c9c7b2] leading-relaxed">
              {t.landingFeaturePrivacyDesc}
            </p>
            <div className="mt-auto pt-3 border-t border-[#242828] text-[11px] font-mono text-[#93927e] flex items-center justify-between">
              <span>Гость • Участник • Админ</span>
              <span className="text-[#c9cd58]">3 роли</span>
            </div>
          </div>

          {/* Card 2: Obsidian 2-Way Sync */}
          <div className="p-6 rounded-xl bg-[#181a1a] border border-[#8b5cf6]/40 flex flex-col gap-3 relative group hover:border-[#a855f7] transition-all shadow-[0_0_20px_rgba(168,85,247,0.1)]">
            <div className="w-10 h-10 rounded-lg bg-[#a855f7]/20 border border-[#a855f7]/40 flex items-center justify-center text-lg">
              <ObsidianLogo size={22} glow />
            </div>
            <h3 className="font-sans font-bold text-sm text-[#f3e8ff] flex items-center gap-2">
              <span>{t.landingFeatureObsidianTitle}</span>
            </h3>
            <p className="text-xs text-[#c9c7b2] leading-relaxed">
              {t.landingFeatureObsidianDesc}
            </p>
            <div className="mt-auto pt-3 border-t border-[#242828] text-[11px] font-mono text-[#93927e] flex items-center justify-between">
              <span>Приватные контейнеры</span>
              <span className="text-[#a855f7] font-bold">Obsidian Connection</span>
            </div>
          </div>

          {/* Card 3: Multi-View Projections */}
          <div className="p-6 rounded-xl bg-[#181a1a] border border-[#242828] flex flex-col gap-3 relative group hover:border-[#c9cd58]/40 transition-all">
            <div className="w-10 h-10 rounded-lg bg-[#3b82f6]/20 border border-[#3b82f6]/40 flex items-center justify-center text-lg text-[#3b82f6]">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-sans font-bold text-sm text-[#e5e971]">
              {t.landingFeatureTimelineTitle}
            </h3>
            <p className="text-xs text-[#c9c7b2] leading-relaxed">
              {t.landingFeatureTimelineDesc}
            </p>
            <div className="mt-auto pt-3 border-t border-[#242828] text-[11px] font-mono text-[#93927e] flex items-center justify-between">
              <span>Лента • Месяц • Гант</span>
              <span className="text-[#3b82f6]">Time-Slice</span>
            </div>
          </div>
        </div>
      </section>


      {/* 6. Footer */}
      <footer className="mt-auto border-t border-[#242828] bg-[#101212] px-4 lg:px-8 py-8 w-full">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#93927e]">
          <div className="flex items-center gap-2">
            <span className="text-lg">🍋</span>
            <span className="text-[#e5e971] font-bold">Lemon Calendarium / Project Lenta</span>
            <span>• © 2026 The Lemon Team</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => openAuthModal('login')}
              className="hover:text-[#e5e971] transition-colors"
            >
              {t.login}
            </button>
            <button
              onClick={() => openAuthModal('register')}
              className="hover:text-[#e5e971] transition-colors"
            >
              {t.register}
            </button>
            <span className="text-[#555]">•</span>
            <span className="text-[#76786b]">Headless Chronological Data Hub</span>
          </div>
        </div>
      </footer>

      {/* Note Detail Reader Modal */}
      <NoteDetailModal
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
      />
    </div>
  );
};
