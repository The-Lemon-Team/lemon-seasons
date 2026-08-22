import React from 'react';
import { Radio, Clock, ArrowRight, Calendar } from 'lucide-react';
import { FeedThemeConfig } from '../utils/feedThemes';
import { useI18n } from '../i18n';

export interface FeedsHubHeaderProps {
  totalChannels: number;
  notesCount: number;
  activeFeedSlug?: string;
  activeTheme?: FeedThemeConfig | null;
  isAllSelected: boolean;
  onNavigateToTimeline: () => void;
  onNavigateToCalendar: () => void;
}

export const FeedsHubHeader: React.FC<FeedsHubHeaderProps> = ({
  totalChannels,
  notesCount,
  activeFeedSlug,
  activeTheme,
  isAllSelected,
  onNavigateToTimeline,
  onNavigateToCalendar,
}) => {
  const { t } = useI18n();

  return (
    <div className="shrink-0 w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#181d1e] via-[#1a1c1c] to-[#121414] border border-[#2e3232] p-5 sm:p-6 shadow-2xl">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-[#c9cd58]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left Hero Title & Info */}
        <div className="space-y-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c9cd58]/30 to-[#535600]/20 border border-[#c9cd58]/60 flex items-center justify-center text-xl shadow-glow-lemon shrink-0">
              <Radio className="w-5 h-5 text-[#e5e971] animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-sans text-white tracking-wide flex items-center gap-2 flex-wrap">
                <span>{t.hubTitle}</span>
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-[#c9cd58]/20 border border-[#c9cd58]/40 text-[#e5e971]">
                  Channel Hub
                </span>
                {!isAllSelected && activeTheme && (
                  <span
                    className="text-xs font-mono px-2 py-0.5 rounded-full border flex items-center gap-1"
                    style={{
                      backgroundColor: activeTheme.badgeBg,
                      borderColor: activeTheme.borderAccent,
                      color: activeTheme.accentColor,
                    }}
                  >
                    <span>{activeTheme.emoji}</span>
                    <span>{activeTheme.shortTitle}</span>
                  </span>
                )}
              </h1>
              <p className="text-xs font-mono text-[#c9c7b2] opacity-80 mt-0.5">
                {t.hubSubtitle}
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 sm:gap-4 pt-1 text-xs font-mono flex-wrap">
            <div className="flex items-center gap-1.5 bg-[#121414]/80 border border-[#242828] px-2.5 py-1 rounded-lg">
              <span className="text-[#c9cd58] font-bold tabular-nums">{totalChannels}</span>
              <span className="text-neutral-400">{t.allChannels}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#121414]/80 border border-[#242828] px-2.5 py-1 rounded-lg">
              <span className="text-[#38bdf8] font-bold tabular-nums">{notesCount}</span>
              <span className="text-neutral-400">{t.totalNotesCount}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#121414]/80 border border-[#242828] px-2.5 py-1 rounded-lg">
              <span
                className="font-bold truncate max-w-[200px]"
                style={{ color: !isAllSelected && activeTheme ? activeTheme.accentColor : '#f87171' }}
              >
                {isAllSelected ? t.presetAll : activeTheme?.shortTitle || activeFeedSlug}
              </span>
              <span className="text-neutral-400">{t.activeInCalendar}</span>
            </div>
          </div>
        </div>

        {/* Right Action Switchers */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            onClick={onNavigateToTimeline}
            className="flex items-center gap-2 bg-[#c9cd58] hover:bg-[#d4e157] text-[#121414] font-mono text-xs font-bold px-4 py-2.5 rounded-xl shadow-glow-lemon transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t.openInTimeline}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onNavigateToCalendar}
            className="flex items-center gap-2 bg-[#1e2020] hover:bg-[#282a2a] border border-[#383a3a] text-[#e2e2e2] hover:text-white font-mono text-xs px-3.5 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Calendar className="w-3.5 h-3.5 text-[#c9cd58]" />
            <span>{t.calendar}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

