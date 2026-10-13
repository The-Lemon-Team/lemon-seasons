import React, { useState, useMemo } from 'react';
import { Note, truncateMarkdown, cleanNoteMarkdown, extractCleanSnippet } from '@lenta/shared';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Eye,
  Tag,
  Clock,
  Flame,
  ArrowRight,
  Share2,
} from 'lucide-react';
import { getThematicCategoryBadge } from '../../utils/sparkFeeds';

import { UnifiedFeedItem } from '../../adapters/feeds/types';

export interface FeedPostCardProps {
  item?: UnifiedFeedItem;
  note?: Note;
  onSelectNote?: (note: Note) => void;
  className?: string;
}

function formatViews(score?: number | null): string {
  if (!score) return '1.2K';
  if (score < 1000) return `${score}`;
  if (score < 1000000) return `${(score / 1000).toFixed(1)}K`;
  return `${(score / 1000000).toFixed(1)}M`;
}

function getAvatarContent(note: Note, categoryBadge: { emoji: string }): string {
  if (note.icon) {
    if (Array.from(note.icon).length <= 2) {
      return note.icon;
    }
    const iconKey = note.icon.toLowerCase();
    if (iconKey.includes('bot') || iconKey.includes('ai')) return '🤖';
    if (iconKey.includes('code') || iconKey.includes('habr')) return '💻';
    if (iconKey.includes('ghost')) return '👻';
    if (iconKey.includes('palett')) return '🎨';
    if (iconKey.includes('globe') || iconKey.includes('world')) return '🌐';
    if (iconKey.includes('radio') || iconKey.includes('news')) return '📡';
  }
  const slug = note.feed?.slug?.toLowerCase() || '';
  if (slug.includes('ai')) return '🤖';
  if (slug.includes('habr')) return '💻';
  return categoryBadge.emoji || '✨';
}

export const FeedPostCard: React.FC<FeedPostCardProps> = ({
  item,
  note,
  onSelectNote,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const actualNote: Note = (item?.rawPayload as Note) || note!;
  const title = item ? item.title : actualNote.title;
  const channelTitle = item
    ? item.channelTitle
    : (actualNote.feed?.title || 'Spark News').replace(/\s*\(Spark\)/i, '').trim();
  const channelHandle = item ? item.channelHandle : actualNote.feed?.slug || 'spark';
  const categoryBadge = item ? item.category : getThematicCategoryBadge(actualNote.feed?.title || '');
  const avatarChar = item ? item.avatarIcon : getAvatarContent(actualNote, categoryBadge);
  const publishedAt = item ? item.publishedAt : actualNote.startDate;
  const rawDescription = item ? item.description : actualNote.description || '';
  const timeSlot = item ? item.timeSlot : (actualNote.metadata as any)?.timeSlot;
  const resonance = item
    ? item.resonanceScore
    : ((actualNote.metadata as any)?.resonanceScore ?? (actualNote as any).resonanceScore);
  const sourceLink = item ? item.sourceLink : actualNote.sourceLink;
  const curator = item ? item.curator : actualNote.curator;
  const hashtags = item ? item.hashtags || [] : actualNote.hashtags?.map((h) => h.name) || [];

  const formattedDate = new Date(publishedAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const summaryText = item?.summary || (actualNote as any)?.summary;

  const cleanedFullMarkdown = useMemo(() => {
    return cleanNoteMarkdown(rawDescription, { title });
  }, [rawDescription, title]);

  const cleanPreview = useMemo(() => {
    return extractCleanSnippet(rawDescription, 240, {
      summary: summaryText,
      title,
    });
  }, [rawDescription, summaryText, title]);

  const isLongText = cleanedFullMarkdown.length > 220;
  const displayText = isExpanded ? cleanedFullMarkdown : cleanPreview;
  const isHighResonance = typeof resonance === 'number' && resonance >= 80;

  return (
    <article
      onClick={() => onSelectNote?.(actualNote)}
      className={`rounded-2xl border transition-all duration-200 p-4 sm:p-5 select-none cursor-pointer group bg-white dark:bg-[#17212b] border-slate-200 dark:border-white/[0.08] shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-[#2481cc]/50 dark:hover:border-[#3390ec]/50 animate-fade-in ${className}`}
    >
      {/* 1. Header: Channel Avatar, Handle, Category Badge & Date */}
      <div className="flex items-center justify-between gap-2.5 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Channel Avatar */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-500/10 via-sky-500/15 to-indigo-500/20 border border-slate-200 dark:border-white/10 flex items-center justify-center text-sm sm:text-base font-bold text-[#2481cc] dark:text-[#64b5f6] shadow-2xs">
            {avatarChar}
          </div>

          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-xs sm:text-[13px] text-slate-900 dark:text-white truncate">
                {channelTitle}
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                @{channelHandle}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-[#8292a2]">
              <span className="flex items-center gap-1 whitespace-nowrap">
                <Clock className="w-3 h-3 opacity-75 shrink-0" />
                <span>{formattedDate}</span>
              </span>
              {timeSlot && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-white/10 font-mono whitespace-nowrap">
                  {timeSlot === 'MORNING' ? '🌅 Утро' : timeSlot === 'EVENING' ? '🌆 Вечер' : '☀️ День'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Header: Thematic Badge & External Link */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs ${categoryBadge.colorClass}`}
          >
            <span>{categoryBadge.emoji}</span>
            <span className="hidden sm:inline">{categoryBadge.label}</span>
          </span>

          {sourceLink && (
            <a
              href={sourceLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Перейти к источнику"
              className="p-1 rounded-full text-slate-400 hover:text-[#2481cc] hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* 2. News Title */}
      <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-white mb-2 group-hover:text-[#2481cc] dark:group-hover:text-[#64b5f6] transition-colors leading-snug tracking-[-0.01em]">
        {title}
      </h3>

      {/* 3. News Content / Summary Preview */}
      <div className="text-[13.5px] sm:text-[14px] text-slate-700 dark:text-slate-200 leading-relaxed break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ node, ...props }) => <p className="mb-2 last:mb-0 text-slate-700 dark:text-slate-200" {...props} />,
            strong: ({ node, ...props }) => (
              <strong className="font-semibold text-slate-900 dark:text-white" {...props} />
            ),
            a: ({ node, ...props }) => (
              <a
                className="text-[#2481cc] dark:text-[#64b5f6] hover:underline font-medium"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                {...props}
              />
            ),
            ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-200" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-200" {...props} />,
            blockquote: ({ node, ...props }) => (
              <blockquote
                className="border-l-2 border-[#2481cc]/40 pl-3 my-2 text-slate-600 dark:text-slate-300 italic text-[12.5px]"
                {...props}
              />
            ),
            code: ({ node, inline, ...props }: any) =>
              inline ? (
                <code
                  className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-[11.5px] text-slate-800 dark:text-slate-200 font-medium"
                  {...props}
                />
              ) : (
                <code
                  className="block p-2 rounded-lg bg-slate-100 dark:bg-black/30 font-mono text-[11px] text-slate-800 dark:text-slate-200 overflow-x-auto my-1 border border-slate-200/50 dark:border-white/10"
                  {...props}
                />
              ),
          }}
        >
          {displayText}
        </ReactMarkdown>

        {isLongText && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
            className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-[#2481cc] dark:text-[#64b5f6] hover:underline"
          >
            <span>{isExpanded ? 'Свернуть' : 'Читать далее'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* 4. Footer: Views, Resonance, Tags & Open Detail CTA */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 dark:text-[#708499] flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {/* Views count */}
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
            <Eye className="w-3.5 h-3.5 opacity-80" />
            <span className="font-mono text-xs font-semibold">
              {formatViews(resonance)}
            </span>
          </div>

          {/* High Resonance Indicator */}
          {isHighResonance && (
            <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold text-[10px] bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-300/70 dark:border-amber-800/40">
              <Flame className="w-3 h-3 fill-current" />
              <span>Резонанс {resonance}%</span>
            </div>
          )}

          {/* Curator Source */}
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            <Sparkles className="w-3 h-3 text-[#2481cc]" />
            <span>{curator && curator !== 'auto' ? curator : 'Spark Feed'}</span>
          </div>
        </div>

        {/* Hashtags & Detail prompt */}
        <div className="flex items-center gap-2">
          {hashtags && hashtags.length > 0 && (
            <div className="flex items-center gap-1 overflow-hidden">
              {hashtags.slice(0, 2).map((h) => (
                <span
                  key={h}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300 border border-slate-200/50 dark:border-white/5"
                >
                  #{h.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}

          <span className="text-[11px] font-semibold text-[#2481cc] dark:text-[#64b5f6] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            <span>Открыть</span>
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </article>
  );
};
