import React, { useState } from 'react';
import { Button, Tooltip, Tag } from 'antd';
import {
  ChevronLeft,
  ChevronRight,
  BookmarkPlus,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Layers,
  LayoutGrid,
  FolderPlus,
} from 'lucide-react';
import { TelegramNewsPreview } from '../../../types';

interface CuratorNewsGalleryProps {
  posts: TelegramNewsPreview[];
  onSaveToCalendar?: (post: TelegramNewsPreview) => void;
  onDiscussInChat?: (post: TelegramNewsPreview) => void;
  onAddToNote?: (post: TelegramNewsPreview) => void;
}

export const CuratorNewsGallery: React.FC<CuratorNewsGalleryProps> = React.memo(
  ({ posts, onSaveToCalendar, onDiscussInChat, onAddToNote }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('carousel');
    const [visibleGridCount, setVisibleGridCount] = useState(3);

    if (!posts || posts.length === 0) return null;

    const total = posts.length;
    const activePost = posts[Math.min(currentIndex, total - 1)];

    const handlePrev = () => {
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
    };

    const handleNext = () => {
      setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
    };

    const handleLoadMore = () => {
      setVisibleGridCount((prev) => Math.min(prev + 3, total));
    };

    return (
      <div className="mt-3 pt-3 border-t border-white/10 select-none">
        {/* Gallery Control Bar */}
        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/5 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="material-symbols-outlined text-sky-400 text-sm">collections_bookmark</span>
            <span className="font-bold text-[11px] text-gray-200 uppercase tracking-wider">
              Карточки куратора
            </span>
            <Tag bordered={false} className="bg-sky-500/20 text-sky-300 text-[9px] font-mono px-1 py-0 m-0">
              {total}
            </Tag>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/5 rounded-md p-0.5 border border-white/5">
              <button
                type="button"
                onClick={() => setViewMode('carousel')}
                className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 transition-all ${
                  viewMode === 'carousel'
                    ? 'bg-primary text-black font-bold shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="По одной карточке в карусели"
              >
                <Layers className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Карусель</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 transition-all ${
                  viewMode === 'grid'
                    ? 'bg-primary text-black font-bold shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Показать карточки сеткой"
              >
                <LayoutGrid className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Сетка</span>
              </button>
            </div>

            {/* Carousel navigation controls in carousel mode */}
            {viewMode === 'carousel' && total > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-5 h-5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-gray-300 flex items-center justify-center transition-all cursor-pointer"
                  title="Предыдущая карточка"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="text-[10px] font-mono text-gray-400 px-1">
                  {currentIndex + 1}/{total}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-5 h-5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-gray-300 flex items-center justify-center transition-all cursor-pointer"
                  title="Следующая карточка"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 1. Carousel Mode */}
        {viewMode === 'carousel' && activePost && (
          <div className="bg-[#12161f] border border-white/10 rounded-xl p-3 shadow-md transition-all">
            {/* Card Header */}
            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/5 text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span>{activePost.curatorEmoji || '👤'}</span>
                <span className="font-semibold text-gray-200 truncate">
                  {activePost.curatorName}
                </span>
                {activePost.sourceName && (
                  <span className="text-gray-400 text-[10px] flex items-center gap-0.5 truncate">
                    · {activePost.sourceName}
                    {activePost.sourceUrl && (
                      <a
                        href={activePost.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 hover:text-sky-300 ml-0.5"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Title & Summary */}
            <h4 className="font-bold text-xs text-white mb-1.5 leading-snug">
              {activePost.title}
            </h4>
            <p className="text-[11px] text-gray-300 leading-relaxed mb-2">
              {activePost.summary}
            </p>

            {/* Key Points */}
            {activePost.keyPoints && activePost.keyPoints.length > 0 && (
              <div className="space-y-1 mb-2.5 pl-3 border-l-2 border-primary/40 text-[10px] text-gray-300">
                {activePost.keyPoints.slice(0, 3).map((pt, idx) => (
                  <div key={idx} className="leading-tight">
                    • {pt}
                  </div>
                ))}
              </div>
            )}

            {/* Card Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
              <div className="flex items-center gap-1 flex-wrap">
                {activePost.tags?.slice(0, 3).map((tag, i) => (
                  <span
                    key={i}
                    className="text-[9px] bg-white/5 text-gray-400 px-1 py-0.2 rounded font-mono"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                {onAddToNote && (
                  <Button
                    type="text"
                    size="small"
                    onClick={() => onAddToNote(activePost)}
                    className="text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 text-[10px] h-6 px-2 rounded flex items-center gap-1 border border-amber-500/20"
                    title="Добавить в Note + (собрать материалы для подкаста / NotebookLM)"
                  >
                    <FolderPlus className="w-2.5 h-2.5" />
                    <span>+ В Note</span>
                  </Button>
                )}

                {onDiscussInChat && (
                  <Button
                    type="text"
                    size="small"
                    onClick={() => onDiscussInChat(activePost)}
                    className="text-gray-300 hover:text-white hover:bg-white/10 text-[10px] h-6 px-2 rounded flex items-center gap-1 border border-white/10"
                    title="Обсудить эту новость с куратором"
                  >
                    <MessageSquare className="w-2.5 h-2.5 text-sky-400" />
                    <span>Обсудить</span>
                  </Button>
                )}

                {onSaveToCalendar && (
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => onSaveToCalendar(activePost)}
                    className="bg-primary hover:bg-primary/90 text-black font-bold text-[10px] h-6 px-2 rounded flex items-center gap-1 border-0"
                    title="Оформить в карточку хроники календаря"
                  >
                    <BookmarkPlus className="w-2.5 h-2.5 fill-current" />
                    <span>В календарь</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. Grid / Paginated Mode */}
        {viewMode === 'grid' && (
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2">
              {posts.slice(0, visibleGridCount).map((post) => (
                <div
                  key={post.id}
                  className="bg-[#12161f] border border-white/10 rounded-xl p-2.5 text-xs shadow-sm hover:border-white/20 transition-all"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 truncate">
                      <span>{post.curatorEmoji}</span>
                      <span className="font-semibold text-gray-300">{post.curatorName}</span>
                      {post.sourceName && <span>· {post.sourceName}</span>}
                    </div>
                  </div>

                  <h5 className="font-bold text-[11px] text-white leading-snug mb-1">
                    {post.title}
                  </h5>
                  <p className="text-[10px] text-gray-300 line-clamp-2 leading-relaxed mb-2">
                    {post.summary}
                  </p>

                  <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-white/5">
                    <span className="text-[9px] text-gray-500 font-mono">
                      #{post.tags?.[0] || 'Новость'}
                    </span>

                    <div className="flex items-center gap-1">
                      {onAddToNote && (
                        <button
                          type="button"
                          onClick={() => onAddToNote(post)}
                          className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-0.5"
                          title="Добавить в Note +"
                        >
                          <FolderPlus className="w-2.5 h-2.5" />
                          <span>+ В Note</span>
                        </button>
                      )}

                      {onDiscussInChat && (
                        <button
                          type="button"
                          onClick={() => onDiscussInChat(post)}
                          className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 hover:bg-white/15 text-sky-300 border border-white/10 transition-colors flex items-center gap-0.5"
                        >
                          <MessageSquare className="w-2.5 h-2.5" />
                          <span>Обсудить</span>
                        </button>
                      )}

                      {onSaveToCalendar && (
                        <button
                          type="button"
                          onClick={() => onSaveToCalendar(post)}
                          className="px-1.5 py-0.5 rounded text-[9px] bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 font-bold transition-colors flex items-center gap-0.5"
                        >
                          <BookmarkPlus className="w-2.5 h-2.5" />
                          <span>В календарь</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button for Pagination */}
            {visibleGridCount < total && (
              <div className="text-center pt-1">
                <Button
                  type="dashed"
                  size="small"
                  onClick={handleLoadMore}
                  className="bg-white/5 border-white/15 hover:border-primary text-gray-300 hover:text-white text-[10px] h-6 px-3 rounded-lg"
                >
                  Загрузить ещё (+{Math.min(3, total - visibleGridCount)}) · Осталось{' '}
                  {total - visibleGridCount}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

CuratorNewsGallery.displayName = 'CuratorNewsGallery';
