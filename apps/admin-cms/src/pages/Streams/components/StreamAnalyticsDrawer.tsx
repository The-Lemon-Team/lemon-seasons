import React, { useState, useEffect } from 'react';
import { Stream, Feed, Note } from '@lenta/shared';
import { useQuery } from '@tanstack/react-query';
import { notesApi } from '../../../api/client';
import { X, ExternalLink, Edit3, BarChart2, Layers, Calendar, Clock, Hash, Globe, Lock, FileText, Activity } from 'lucide-react';
import { EXTERNAL_APP_URLS } from '../../../components/sidebar/sidebar.constants';
import { useNavigate } from 'react-router-dom';

export interface StreamAnalyticsDrawerProps {
  stream: Stream | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (stream: Stream) => void;
  allFeeds: Feed[];
}

export const StreamAnalyticsDrawer: React.FC<StreamAnalyticsDrawerProps> = ({
  stream,
  isOpen,
  onClose,
  onEdit,
  allFeeds,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'metrics' | 'recent' | 'events'>('metrics');

  // Handle Escape key (Rule 7)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Query recent notes for this stream
  const { data: recentNotesData, isLoading: isLoadingNotes } = useQuery({
    queryKey: ['notes', 'stream-analytics', stream?.slug],
    queryFn: () => notesApi.getAll({ streamSource: stream?.slug, limit: 15 }),
    enabled: Boolean(isOpen && stream?.slug),
    staleTime: 30_000,
  });

  if (!isOpen || !stream) return null;

  const notes: Note[] = recentNotesData?.items || [];
  const totalNotes = recentNotesData?.total ?? stream._count?.notes ?? 0;

  // Compute note type distribution
  const typeCounts: Record<string, number> = {};
  for (const n of notes) {
    typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
  }

  const boundFeeds = (stream.feedIds || [])
    .map((id) => allFeeds.find((f) => f.id === id || f.slug === id))
    .filter(Boolean) as Feed[];

  const feedAppUrl = `${EXTERNAL_APP_URLS.feedApp}/?mode=${encodeURIComponent(stream.slug)}`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end transition-opacity duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl h-full bg-platform border-l border-tile-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-tile-border bg-tile-subtle flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl shadow-xs"
              style={{
                backgroundColor: stream.color ? `${stream.color}25` : 'rgba(99, 102, 241, 0.15)',
                border: `1px solid ${stream.color || '#6366f1'}40`,
              }}
            >
              {stream.icon || '📁'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-on-surface truncate">
                  {stream.title}
                </h2>
                {stream.badge && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 uppercase">
                    {stream.badge}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    stream.privacy === 'public'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  }`}
                >
                  {stream.privacy === 'public' ? (
                    <Globe className="w-2.5 h-2.5" />
                  ) : (
                    <Lock className="w-2.5 h-2.5" />
                  )}
                  <span>{stream.privacy}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                <code className="font-mono text-[11px] bg-control px-1 py-0.2 rounded border border-control-border">
                  {stream.slug}
                </code>
                {stream.description && (
                  <span className="truncate max-w-[280px]">{stream.description}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(stream)}
              title="Редактировать стрим"
              className="p-1.5 rounded-lg text-text-muted hover:text-on-surface hover:bg-tile transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <a
              href={feedAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Открыть в Feed App"
              className="p-1.5 rounded-lg text-text-muted hover:text-blue-400 hover:bg-tile transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-on-surface hover:bg-tile transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-4 border-b border-tile-border bg-tile text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`py-2 px-2.5 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'metrics'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-text-muted hover:text-on-surface'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Метрики & Структура</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recent')}
            className={`py-2 px-2.5 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'recent'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-text-muted hover:text-on-surface'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Недавние записи</span>
            <span className="text-[10px] opacity-70">({notes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={`py-2 px-2.5 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'events'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-text-muted hover:text-on-surface'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Шина EventBus</span>
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {activeTab === 'metrics' && (
            <div className="space-y-4">
              {/* Stat Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-control/60 border border-control-border rounded-xl">
                  <div className="text-[10px] font-mono text-text-muted uppercase">Заметок в стриме</div>
                  <div className="text-xl font-bold text-on-surface font-mono mt-1">
                    {totalNotes}
                  </div>
                </div>
                <div className="p-3 bg-control/60 border border-control-border rounded-xl">
                  <div className="text-[10px] font-mono text-text-muted uppercase">Лент привязано</div>
                  <div className="text-xl font-bold text-primary font-mono mt-1">
                    {boundFeeds.length}
                  </div>
                </div>
                <div className="p-3 bg-control/60 border border-control-border rounded-xl">
                  <div className="text-[10px] font-mono text-text-muted uppercase">Критериев тегов</div>
                  <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                    {stream.tags?.length || 0}
                  </div>
                </div>
              </div>

              {/* Note Types Distribution */}
              <div className="p-3.5 bg-tile-subtle border border-tile-border rounded-xl space-y-2">
                <div className="text-xs font-semibold text-on-surface">
                  Распределение по типам записей
                </div>
                {Object.keys(typeCounts).length === 0 ? (
                  <p className="text-xs text-text-muted">Записи не обнаружены</p>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    {Object.entries(typeCounts).map(([type, count]) => {
                      const pct = Math.round((count / (notes.length || 1)) * 100);
                      return (
                        <div key={type} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-on-surface font-medium">{type}</span>
                            <span className="text-text-muted">{count} шт. ({pct}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-control rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bound Feeds List */}
              <div className="p-3.5 bg-tile-subtle border border-tile-border rounded-xl space-y-2">
                <div className="text-xs font-semibold text-on-surface flex items-center justify-between">
                  <span>Привязанные ленты</span>
                  <span className="text-[10px] font-mono text-text-muted">
                    {boundFeeds.length} шт.
                  </span>
                </div>
                {boundFeeds.length === 0 ? (
                  <p className="text-xs text-text-muted italic">
                    Ленты не выбраны (стрим агрегирует все публичные фиды)
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {boundFeeds.map((feed) => (
                      <span
                        key={feed.id}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-control border border-control-border text-xs text-on-surface"
                      >
                        <span>{feed.icon || '📁'}</span>
                        <span className="font-medium">{feed.title}</span>
                        <code className="text-[9px] text-text-muted font-mono">
                          {feed.slug}
                        </code>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags & Folders */}
              <div className="p-3.5 bg-tile-subtle border border-tile-border rounded-xl space-y-2">
                <div className="text-xs font-semibold text-on-surface">
                  Фильтры тегов и каталогов
                </div>
                <div className="space-y-1 text-xs">
                  <div className="text-[11px] text-text-muted">Теги:</div>
                  <div className="flex flex-wrap gap-1">
                    {(stream.tags || []).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      >
                        #{t}
                      </span>
                    ))}
                    {(!stream.tags || stream.tags.length === 0) && (
                      <span className="text-xs text-text-muted italic">Теги не заданы</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recent' && (
            <div className="space-y-2">
              {isLoadingNotes && (
                <div className="py-8 text-center text-xs text-text-muted">
                  Загрузка недавних записей...
                </div>
              )}
              {!isLoadingNotes && notes.length === 0 && (
                <div className="py-8 text-center text-xs text-text-muted">
                  Записи в данном стриме не найдены
                </div>
              )}
              {notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => navigate(`/notes/${note.id}`)}
                  className="p-2.5 rounded-lg bg-tile border border-tile-border hover:border-primary/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
                      {note.title}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-control border border-control-border text-text-muted shrink-0">
                      {note.type}
                    </span>
                  </div>
                  {note.description && (
                    <p className="text-[11px] text-text-muted line-clamp-2 mt-1">
                      {note.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-text-muted">
                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    {note.feed && (
                      <span className="text-primary truncate">
                        • {note.feed.title}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-3">
              <div className="p-3 bg-control/60 border border-control-border rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-primary font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Шина EventBus активна</span>
                </div>
                <p className="text-[11px] text-text-muted">
                  События стрима транслируются через Server-Sent Events (SSE) в приложения Feed App и Calendar App.
                </p>
              </div>

              <div className="p-3 bg-tile-subtle border border-tile-border rounded-xl space-y-2 text-xs font-mono">
                <div className="text-[11px] text-text-muted">SSE Канал:</div>
                <div className="text-xs text-on-surface bg-control p-2 rounded border border-control-border break-all">
                  GET /events?streamSource={stream.slug}
                </div>
                <div className="text-[10px] text-text-muted pt-1">
                  Слушатели: feed-app (useFeedLiveEvents), calendar-app (LiveSSEHub)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
