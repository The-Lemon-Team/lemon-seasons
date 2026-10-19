import React, { useState } from 'react';
import {
  useFeeds,
  useNotes,
  useHashtags,
  useFolders,
  useSyncChanges,
  useSystemStats,
  useWatcherStatus,
} from '../../api/queries';
import { NoteTypeBadge } from '../../components/NoteTypeBadge';
import { HashtagBadge } from '../../components/HashtagBadge';
import { NoteDetailModal } from '../../components/NoteDetailModal';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Rss,
  FileText,
  Hash,
  FolderGit2,
  Cloud,
  ShieldCheck,
  Link2,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useAdminI18n } from '../../i18n';

export const DashboardPage: React.FC = () => {
  const { t } = useAdminI18n();
  const navigate = useNavigate();
  const [sinceTime, setSinceTime] = useState<string>('');
  const [viewingNoteId, setViewingNoteId] = useState<string | null>(null);

  const { data: feeds = [] } = useFeeds();
  const { data: notesData } = useNotes({ limit: 6 });
  const { data: hashtags = [] } = useHashtags();
  const { data: folders = [] } = useFolders();
  const { data: syncData, isFetching: isSyncFetching, refetch: refetchSync } = useSyncChanges(
    sinceTime || undefined,
  );

  const notes = notesData?.items || [];
  const totalNotes = notesData?.total || 0;
  const { data: stats } = useSystemStats();
  const { data: watcherStatus } = useWatcherStatus(5000);

  return (
    <div className="flex-1 min-h-0 h-full overflow-y-auto custom-scrollbar pr-1 space-y-3.5">
      {/* Welcome Banner */}
      <div className="flex justify-between items-center h-8">
        <div>
          <h1 className="font-sans font-bold text-base text-on-surface">
            {t.dashboardTitle}
          </h1>
          <p className="text-on-surface-variant text-[11px] font-mono hidden sm:block">
            {t.dashboardSubtitle}
          </p>
        </div>

        <button
          onClick={() => navigate('/notes/new')}
          className="h-7.5 px-3 bg-primary text-on-primary hover:bg-primary-fixed rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 shadow cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addNoteBtn}</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        <div
          onClick={() => navigate('/feeds')}
          className="platform-tile platform-tile-hover p-2.5 sm:p-3 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-on-surface-variant mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider">{t.activeFeedsMetric}</span>
            <Rss className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
          </div>
          <div className="font-sans font-bold text-xl sm:text-2xl text-on-surface">{feeds.length}</div>
          <p className="text-[10px] text-outline mt-0.5 font-mono">{t.dataStreamsSub}</p>
        </div>

        <div
          onClick={() => navigate('/notes')}
          className="platform-tile platform-tile-hover p-2.5 sm:p-3 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-on-surface-variant mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider">{t.totalNotesMetric}</span>
            <FileText className="w-3.5 h-3.5 text-secondary group-hover:scale-110 transition-transform" />
          </div>
          <div className="font-sans font-bold text-xl sm:text-2xl text-on-surface">{stats?.notesTotal ?? totalNotes}</div>
          <p className="text-[10px] text-outline mt-0.5 font-mono">{t.singleTruthSub}</p>
        </div>

        <div
          onClick={() => navigate('/notes')}
          className="platform-tile platform-tile-hover p-2.5 sm:p-3 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-on-surface-variant mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider">{t.vaultFoldersMetric}</span>
            <FolderGit2 className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
          </div>
          <div className="font-sans font-bold text-xl sm:text-2xl text-primary">{folders.length}</div>
          <p className="text-[10px] text-outline mt-0.5 font-mono">{t.obsidianPathsSub}</p>
        </div>

        <div
          onClick={() => navigate('/notes')}
          className="platform-tile platform-tile-hover p-2.5 sm:p-3 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-on-surface-variant mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider">{t.taxonomyTagsMetric}</span>
            <Hash className="w-3.5 h-3.5 text-tertiary group-hover:scale-110 transition-transform" />
          </div>
          <div className="font-sans font-bold text-xl sm:text-2xl text-on-surface flex items-baseline gap-1.5">
            <span>{hashtags.length}</span>
            <span className="text-xs text-cyan-500 font-mono font-normal">#</span>
          </div>
          <p className="text-[10px] text-outline mt-0.5 font-mono">{t.ltreeSub}</p>
        </div>

        <div
          onClick={() => navigate('/generators?tab=sparks')}
          className="platform-tile platform-tile-hover p-2.5 sm:p-3 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-on-surface-variant mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider">Файловый конвейер</span>
            <Cloud className="w-3.5 h-3.5 text-cyan-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="font-sans font-bold text-base sm:text-lg text-on-surface flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                watcherStatus?.isWatching ? 'bg-primary animate-pulse' : 'bg-rose-400'
              }`}
            />
            {watcherStatus?.isWatching ? t.activeStatus : 'Остановлен'}
          </div>
          <p className="text-[10px] text-outline mt-0.5 font-mono">
            {watcherStatus ? `${watcherStatus.filesProcessed} готово • ${watcherStatus.filesPending} в очереди` : t.syncReady}
          </p>
        </div>
      </div>

      {/* System Health & Note Types Breakdown */}
      {stats && (
        <div className="platform-tile p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-tile-border pb-2">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <div>
                <h3 className="font-sans font-bold text-xs text-on-surface">Состояние системы и хранилища</h3>
                <p className="text-[10px] text-on-surface-variant font-mono">
                  БД: <span className="text-primary font-bold">{stats.system.database}</span> • Аптайм: {Math.floor(stats.system.uptime / 60)} мин • Пользователей: {stats.usersCount} • Активных ключей: {stats.activeKeysCount}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-on-surface-variant">
              <span>Хранилища: <strong className="text-on-surface">{stats.containersCount.total}</strong> ({stats.containersCount.public} / {stats.containersCount.private})</span>
              <span>Медиа: <strong className="text-on-surface">{stats.storage.imagesCount}</strong> ({(stats.storage.totalBytes / (1024 * 1024)).toFixed(1)} МБ)</span>
              {stats.system.lastActivityAt && (
                <span>Посл.: <strong className="text-secondary">{new Date(stats.system.lastActivityAt).toLocaleTimeString()}</strong></span>
              )}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Распределение заметок по типам</span>
              <span className="text-[10px] text-primary">Всего: {stats.notesTotal}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
              {Object.entries(stats.notesByType).map(([type, count]) => (
                <div key={type} className="bg-tile-subtle border border-tile-border rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                  <NoteTypeBadge type={type} size="sm" />
                  <span className="font-mono font-bold text-xs text-on-surface">{Number(count)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Two Columns: Recent Notes & Obsidian Sync Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Recent Notes (Span 2) */}
        <div className="lg:col-span-2 space-y-2 platform-tile p-3">
          <div className="flex justify-between items-center pb-1.5 border-b border-tile-border">
            <h2 className="font-sans font-bold text-xs text-on-surface">
              {t.recentNotesTitle}
            </h2>
            <button
              onClick={() => navigate('/notes')}
              className="text-[11px] font-mono text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              {t.viewAll} →
            </button>
          </div>

          <div className="divide-y divide-tile-border">
            {notes.length === 0 ? (
              <div className="py-6 text-center text-on-surface-variant text-xs font-mono">
                {t.noRecentNotes}
              </div>
            ) : (
              notes.map((note) => {
                const hasImages = Boolean(note.images && note.images.length > 0);
                const mainImage = hasImages
                  ? note.images?.find((img) => img.isMain) || note.images?.[0]
                  : null;
                const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                const thumbUrl = mainImage
                  ? mainImage.thumbnailUrl
                    ? mainImage.thumbnailUrl.startsWith('http')
                      ? mainImage.thumbnailUrl
                      : `${apiBase}${mainImage.thumbnailUrl}`
                    : mainImage.url.startsWith('http')
                    ? mainImage.url
                    : `${apiBase}${mainImage.url}`
                  : null;

                return (
                  <div
                    key={note.id}
                    onClick={() => setViewingNoteId(note.id)}
                    className="py-1.5 flex items-center justify-between hover:bg-tile-subtle px-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-3">
                      {thumbUrl && (
                        <div className="relative w-8 h-8 flex-shrink-0 rounded overflow-hidden bg-tile-subtle border border-tile-border shadow-xs">
                          <img
                            src={thumbUrl}
                            alt={mainImage?.alt || note.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {note.images && note.images.length > 1 && (
                            <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] font-mono text-white/90 px-0.5 rounded-tl">
                              +{note.images.length - 1}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <NoteTypeBadge type={note.type} size="sm" />
                          <span className="font-sans font-semibold text-xs text-on-surface truncate">
                            {note.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-on-surface-variant flex-wrap mt-0.5">
                          <span>{new Date(note.startDate).toLocaleDateString()}</span>
                          {note.feed && <span>• {note.feed.title}</span>}
                          {note.hashtags && note.hashtags.length > 0 && (
                            <span className="flex items-center gap-1">
                              {note.hashtags.slice(0, 2).map((h) => (
                                <HashtagBadge key={h.id} name={h.name} size="xs" />
                              ))}
                              {note.hashtags.length > 2 && (
                                <span className="text-[10px] text-cyan-500/70">
                                   +{note.hashtags.length - 2}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-3.5 h-3.5 text-outline shrink-0" />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Obsidian Sync Hub (Span 1) */}
        <div className="space-y-3 platform-tile p-3">
          <h2 className="font-sans font-bold text-xs text-on-surface flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-primary" />
            {t.deltaInspectorTitle}
          </h2>
          <p className="text-[11px] text-on-surface-variant leading-relaxed font-mono">
            {t.deltaInspectorSub}
          </p>

          <div className="space-y-2 pt-2 border-t border-tile-border">
            <label className="block font-mono text-[10px] text-on-surface-variant uppercase">
              {t.syncChangesTitle || t.syncStateMetric}
            </label>
            <div className="flex gap-1.5">
              <input
                type="datetime-local"
                value={sinceTime}
                onChange={(e) => setSinceTime(e.target.value)}
                placeholder={t.sinceTimestampPlaceholder}
                className="flex-1 bg-control border border-control-border rounded-lg px-2 h-7 text-[11px] text-on-surface font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 [color-scheme:light] dark:[color-scheme:dark]"
              />
              <button
                onClick={() => refetchSync()}
                disabled={isSyncFetching}
                className="h-7 px-2.5 bg-tile-subtle hover:bg-tile-muted text-on-surface rounded-lg text-xs font-mono transition-colors cursor-pointer border border-tile-border"
              >
                {isSyncFetching ? t.loading : t.fetchDeltaBtn}
              </button>
            </div>

            {syncData && (
              <div className="mt-2 bg-tile-subtle rounded-lg p-2.5 border border-tile-border font-mono text-[10px] space-y-1">
                <div className="text-primary font-semibold">
                  ✓ {t.notesSynced(syncData.counts.notes)}
                </div>
                <div className="text-outline text-[9px]">
                  Server: {syncData.syncedAt}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick View / Detail Modal */}
      <NoteDetailModal
        noteId={viewingNoteId}
        open={Boolean(viewingNoteId)}
        onClose={() => setViewingNoteId(null)}
        onEdit={(id) => navigate(`/notes/${id}`)}
        onSelectFolder={(folderPath) => navigate(`/notes?folder=${encodeURIComponent(folderPath)}`)}
        onSelectHashtag={(name) => navigate(`/notes?hashtag=${encodeURIComponent(name)}`)}
      />
    </div>
  );
};

