import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  telegramReaderApi,
  TelegramFolderFeed,
  TelegramFeedPost,
} from '../../api/telegramReaderApi';
import { FeedTabPill } from './FeedTabPill';
import {
  ExternalLink,
  Eye,
  Check,
  CheckCircle2,
  ChevronDown,
  Image as ImageIcon,
  Radio,
  Layers,
  Sparkles,
  RefreshCw,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { getThematicCategoryBadge } from '../../utils/sparkFeeds';
import { TelegramMediaGallery } from './TelegramMediaGallery';

const PAGE_SIZE = 25;

export interface TelegramFeedsStreamProps {
  onSelectChannel?: (channelId: string) => void;
}

export const TelegramFeedsStream: React.FC<TelegramFeedsStreamProps> = () => {
  const [folders, setFolders] = useState<TelegramFolderFeed[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [posts, setPosts] = useState<TelegramFeedPost[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isApiOnline, setIsApiOnline] = useState<boolean | null>(null);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load thematic folders on mount
  const loadFolders = async () => {
    setIsLoadingFolders(true);
    try {
      const data = await telegramReaderApi.getFeeds();
      setFolders(data);
      setIsApiOnline(data.length > 0);
      if (data.length > 0 && !activeFolderId) {
        setActiveFolderId(data[0].id);
      }
    } catch {
      setIsApiOnline(false);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  // Load posts whenever active folder changes (Page 1)
  useEffect(() => {
    if (!activeFolderId) return;

    let isMounted = true;
    setIsLoadingPosts(true);
    setIsLoadingMore(false);
    setHasMore(false);
    setNextCursor(null);

    telegramReaderApi
      .getFeedPosts(activeFolderId, PAGE_SIZE)
      .then((res) => {
        if (!isMounted) return;
        if (res && res.posts) {
          setPosts(res.posts);
          setHasMore(Boolean(res.hasMore && res.nextCursor));
          setNextCursor(res.nextCursor || null);
        } else {
          setPosts([]);
          setHasMore(false);
          setNextCursor(null);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingPosts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeFolderId]);

  // Load more posts (Page 2+)
  const loadMorePosts = useCallback(async () => {
    if (!activeFolderId || !hasMore || isLoadingMore || isLoadingPosts || !nextCursor) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const res = await telegramReaderApi.getFeedPosts(activeFolderId, PAGE_SIZE, nextCursor);
      if (res && res.posts && res.posts.length > 0) {
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const incoming = res.posts.filter((p) => !existingIds.has(p.id));
          return [...prev, ...incoming];
        });
        setHasMore(Boolean(res.hasMore && res.nextCursor));
        setNextCursor(res.nextCursor || null);
      } else {
        setHasMore(false);
        setNextCursor(null);
      }
    } catch (err) {
      console.warn('[TelegramFeedsStream] Failed to load more posts', err);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeFolderId, hasMore, isLoadingMore, isLoadingPosts, nextCursor]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || isLoadingMore || isLoadingPosts) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMorePosts();
        }
      },
      { rootMargin: '350px' }
    );

    const el = loadMoreRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, isLoadingPosts, loadMorePosts]);

  const activeFolder = folders.find((f) => f.id === activeFolderId);
  const thematic = activeFolder ? getThematicCategoryBadge(activeFolder.name) : null;

  return (
    <div className="space-y-4">
      {/* 1. Header & Live Connection Status */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Telegram Web Reader — Тематические папки
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#2481cc]/10 text-[#2481cc] dark:text-[#64b5f6] border border-[#2481cc]/20">
            Live Bridge
          </span>
        </div>

        <button
          type="button"
          onClick={loadFolders}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5 transition"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Обновить</span>
        </button>
      </div>

      {/* 2. Folder Tabs Rail (Horizontal Pills) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
        {folders.map((folder) => {
          const isSelected = activeFolderId === folder.id;
          const badge = getThematicCategoryBadge(folder.name);

          return (
            <FeedTabPill
              key={folder.id}
              label={folder.name}
              emoji={badge.emoji}
              count={folder.unreadCount}
              isActive={isSelected}
              onClick={() => setActiveFolderId(folder.id)}
            />
          );
        })}
      </div>

      {/* Active Folder Meta Subheader */}
      {activeFolder && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#8ea2b7] bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-white">
              {activeFolder.name}
            </span>
            <span>•</span>
            <span>{activeFolder.channelCount} каналов в папке</span>
            <span>•</span>
            <span>{activeFolder.unreadCount} непрочитанных постов</span>
          </div>
          <span className="text-[11px] font-mono opacity-80">
            Источник: Telegram Web Reader
          </span>
        </div>
      )}

      {/* 3. Stream of Posts */}
      {isLoadingPosts ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-[#2481cc]" />
          <span className="text-xs font-mono">Загрузка новостей из папки...</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-center text-slate-400">
          <p className="text-xs">В данной папке пока нет новостных сообщений.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const pubDate = new Date(post.publishedAt).toLocaleDateString([], {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <article
                key={post.id}
                className="rounded-2xl border transition-all duration-150 p-4 bg-white border-slate-200/80 hover:border-slate-300 shadow-xs dark:bg-[#17212b] dark:border-white/[0.08]"
              >
                {/* Channel Header */}
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[#2481cc] text-white flex items-center justify-center font-bold text-xs">
                      {post.channelAvatarUrl ? (
                        <img
                          src={post.channelAvatarUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        post.channelTitle.slice(0, 2).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {post.channelTitle}
                        </h5>
                        {thematic && (
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full border ${thematic.colorClass}`}
                          >
                            {thematic.label}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {pubDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {post.isUnread && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2481cc] text-white">
                        Новое
                      </span>
                    )}
                    <a
                      href={post.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Открыть пост в Telegram"
                      className="p-1 rounded-full text-slate-400 hover:text-[#2481cc] hover:bg-slate-100 dark:hover:bg-white/10 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Media preview */}
                {post.media && post.media.length > 0 && (
                  <TelegramMediaGallery
                    media={post.media}
                    mediaType={post.mediaType}
                    postUrl={post.postUrl}
                  />
                )}

                {/* Post Text */}
                {post.text && (
                  <p className="text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                    {post.text}
                  </p>
                )}

                {/* Footer Info */}
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 dark:text-[#708499]">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{post.views || 0} просмотров</span>
                  </div>
                  <span className="font-mono text-[10px] opacity-60">
                    t.me/{post.channelUsername}/{post.postId}
                  </span>
                </div>
              </article>
            );
          })}

          {/* Pagination: Loading next page */}
          {isLoadingMore && (
            <div className="py-4 text-center text-xs font-mono text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2481cc]" />
              <span>Загрузка следующих публикаций Telegram...</span>
            </div>
          )}

          {/* Pagination: Observer anchor + manual button */}
          {hasMore && !isLoadingMore && (
            <div ref={loadMoreRef} className="py-2 flex justify-center">
              <button
                type="button"
                onClick={loadMorePosts}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-white dark:bg-[#18222d] border border-slate-200/80 dark:border-white/10 hover:border-[#2481cc]/40 text-slate-700 dark:text-slate-300 hover:text-[#2481cc] dark:hover:text-[#64b5f6] shadow-xs transition-colors cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5 text-[#2481cc]" />
                <span>Загрузить ещё публикации</span>
              </button>
            </div>
          )}

          {/* Pagination: All posts loaded indicator */}
          {!hasMore && posts.length > 0 && !isLoadingPosts && (
            <div className="py-4 text-center text-[11px] font-mono text-slate-400 dark:text-slate-500 border-t border-slate-200/40 dark:border-white/5 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80" />
              <span>Все публикации в папке загружены ({posts.length})</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
