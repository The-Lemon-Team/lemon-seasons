import React, { useState } from 'react';
import { Badge, Tooltip } from 'antd';
import {
  MessageSquare,
  ExternalLink,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  Flame,
  Globe,
  Radio,
} from 'lucide-react';
import { TelegramNewsPreview } from '../../../types';

interface TelegramNewsPostProps {
  post: TelegramNewsPreview;
  onNavigateToCurator: (curatorId: string, contextPrompt?: string) => void;
  onSaveToCalendar: (post: TelegramNewsPreview) => void;
}

export const TelegramNewsPost: React.FC<TelegramNewsPostProps> = ({
  post,
  onNavigateToCurator,
  onSaveToCalendar,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const curatorFirstName = post.curatorName ? post.curatorName.split(' ')[0] : 'Куратором';

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-white/10 bg-[#0d1117] shadow-2xl max-w-xl transition-all duration-200 hover:border-white/20">
      {/* 1. Meta Header: Канал / Куратор & Индикатор */}
      <div className="px-3.5 py-2.5 bg-white/[0.03] border-b border-white/5 flex items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm flex-shrink-0">
            {post.curatorEmoji || '📡'}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
              <span>{post.curatorName}</span>
              {post.contourBadge && (
                <span className="text-[10px] font-normal text-sky-400/80 bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20">
                  {post.contourBadge}
                </span>
              )}
            </div>
            <div className="text-[10px] text-gray-400 truncate">{post.curatorRole}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-gray-400 font-mono">
            {post.publishedAt || 'Сегодня'}
          </span>
        </div>
      </div>

      {/* 2. Media Banner (Обложка в стиле Telegram-канала) */}
      {post.imageUrl ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/50 border-b border-white/5 group">
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-transparent to-transparent opacity-80" />
          <div className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full text-[10px] font-mono text-gray-200 flex items-center gap-1 shadow-md">
            <Radio className="w-2.5 h-2.5 text-sky-400 animate-pulse" />
            <span>{post.sourceName}</span>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-gradient-to-r from-sky-950/30 to-purple-950/30 border-b border-white/5 flex items-center justify-between text-xs text-sky-300">
          <div className="flex items-center gap-1.5 font-medium">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Ключевой сюжет повестки</span>
          </div>
          <span className="text-[10px] text-gray-400">{post.sourceName}</span>
        </div>
      )}

      {/* 3. Post Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h4 className="text-sm font-bold text-white leading-snug tracking-tight">
          {post.title}
        </h4>

        {/* Lead Summary */}
        <p className="text-xs text-gray-200 leading-relaxed font-sans">
          {post.summary}
        </p>

        {/* Key Points (Маркеры) */}
        {post.keyPoints && post.keyPoints.length > 0 && (
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
            <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
              <span>📌 Ключевые маркеры и регуляторика:</span>
            </div>
            <ul className="space-y-1 text-[11px] text-gray-300 pl-3.5 list-disc">
              {post.keyPoints.map((pt, idx) => (
                <li key={idx} className="leading-snug">
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Expandable Deep Factcheck / Raw Text (Progressive Disclosure) */}
        {post.rawText && isExpanded && (
          <div className="p-3 rounded-xl bg-black/40 border border-sky-500/20 text-[11px] text-gray-300 leading-relaxed animate-in fade-in duration-200">
            <div className="text-[10px] font-mono uppercase text-sky-400 mb-1 font-bold">
              Фактологическая справка:
            </div>
            {post.rawText}
          </div>
        )}

        {/* Hashtags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] text-sky-400/90 font-mono hover:text-sky-300 transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 4. Action Chips Bar (Telegram-style inline keyboard) */}
      <div className="p-2.5 bg-white/[0.02] border-t border-white/5 flex flex-wrap items-center gap-2">
        {/* Chip 1: Go to curator thread */}
        <button
          type="button"
          onClick={() =>
            onNavigateToCurator(
              post.curatorId,
              `Обсудим новость: "${post.title.substring(0, 70)}..."`
            )
          }
          className="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 hover:border-sky-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>В тред к {curatorFirstName}</span>
        </button>

        {/* Chip 2: Save to chronicle calendar */}
        <button
          type="button"
          onClick={() => onSaveToCalendar(post)}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          title="Сохранить в календарь хроники"
        >
          <BookmarkPlus className="w-3.5 h-3.5 text-primary" />
          <span>В календарь</span>
        </button>

        {/* Chip 3: Toggle full details */}
        {post.rawText && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
            title={isExpanded ? 'Свернуть справку' : 'Развернуть полную справку'}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Свернуть</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Подробнее</span>
              </>
            )}
          </button>
        )}

        {/* Chip 4: Source link */}
        {post.sourceUrl && (
          <Tooltip title={`Открыть источник: ${post.sourceName}`}>
            <a
              href={post.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-all flex items-center justify-center cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Tooltip>
        )}
      </div>
    </div>
  );
};
