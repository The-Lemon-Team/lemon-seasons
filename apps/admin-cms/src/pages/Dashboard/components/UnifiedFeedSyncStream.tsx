import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Note, IngestionFile } from '@lenta/shared';
import {
  FileText,
  Search,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { NoteTypeBadge } from '../../../components/NoteTypeBadge';
import { HashtagBadge } from '../../../components/HashtagBadge';
import { getSparkFolderTheme } from '../../../utils/sparkThemeUtils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';

dayjs.extend(relativeTime);
dayjs.locale('ru');

interface UnifiedFeedSyncStreamProps {
  notes: Note[];
  ingestedFiles?: IngestionFile[];
  isLoading?: boolean;
  onSelectNote: (noteId: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const UnifiedFeedSyncStream: React.FC<UnifiedFeedSyncStreamProps> = ({
  notes,
  ingestedFiles = [],
  isLoading = false,
  onSelectNote,
  onRefresh,
  isRefreshing = false,
}) => {
  const navigate = useNavigate();
  const [activeFolderFilter, setActiveFolderFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Map ingested files by noteId and by fileName for instant enrichment
  const ingestedMap = useMemo(() => {
    const map = new Map<string, IngestionFile>();
    for (const f of ingestedFiles) {
      if (f.noteId) map.set(f.noteId, f);
      map.set(f.fileName.toLowerCase(), f);
    }
    return map;
  }, [ingestedFiles]);

  // Unified stream items
  const streamItems = useMemo(() => {
    return notes.map((note) => {
      // Find matching ingestion file
      const matchingFile = note.id ? ingestedMap.get(note.id) : undefined;
      const fileName = matchingFile?.fileName ||
        (note.filePath ? note.filePath.split(/[\\/]/).pop() : undefined) ||
        `${dayjs(note.startDate).format('YYYY-MM-DD')}-${note.title.toLowerCase().replace(/\s+/g, '-').slice(0, 24)}.md`;

      const folderPath = note.folderPath || (note.folders && note.folders.length > 0 ? note.folders[0].folder.path : 'Spark/AI');
      const theme = getSparkFolderTheme(folderPath);

      return {
        note,
        fileName,
        folderPath,
        theme,
        status: matchingFile?.status || 'COMPLETED',
        updatedAt: note.startDate || note.createdAt,
      };
    });
  }, [notes, ingestedMap]);

  // Unique spark folders for filter pills
  const availableFolders = useMemo(() => {
    const set = new Set<string>();
    for (const item of streamItems) {
      if (item.folderPath) set.add(item.folderPath);
    }
    return Array.from(set);
  }, [streamItems]);

  // Filtered stream items
  const filteredItems = useMemo(() => {
    return streamItems.filter((item) => {
      if (activeFolderFilter !== 'all' && item.folderPath !== activeFolderFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.note.title.toLowerCase().includes(query);
        const matchesFile = item.fileName.toLowerCase().includes(query);
        const matchesHashtag = item.note.hashtags?.some((h) => h.name.toLowerCase().includes(query));
        if (!matchesTitle && !matchesFile && !matchesHashtag) return false;
      }
      return true;
    });
  }, [streamItems, activeFolderFilter, searchQuery]);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  return (
    <div className="flex-1 min-w-0 w-full h-[640px] flex flex-col platform-tile p-3 space-y-2 overflow-hidden shadow-sm">
      {/* 1. Top Header */}
      <div className="flex items-center justify-between gap-2.5 pb-1.5 border-b border-tile-border/60 dark:border-white/[0.05] shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <h2 className="font-sans font-bold text-xs sm:text-sm text-on-surface truncate">
              Последние обновления в лентах & Синхронизация со Spark
            </h2>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Live Feed
            </span>
          </div>
          <p className="text-[10px] text-on-surface-variant/80 font-mono truncate mt-0.5">
            Единый поток входящих заметок и синхронизированных .md файлов без дубликатов
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-6.5 px-2 rounded-lg bg-tile-subtle/60 hover:bg-tile-subtle text-on-surface border border-tile-border dark:border-white/[0.06] text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
              title="Обновить поток"
            >
              <RefreshCw className={`w-3 h-3 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Обновить</span>
            </button>
          )}

          <button
            onClick={() => navigate('/notes')}
            className="text-[10px] font-mono text-secondary hover:text-primary transition-colors flex items-center gap-0.5 cursor-pointer pl-1 font-medium"
          >
            <span className="hidden sm:inline">Вся база</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. Filter and Search Bar (Subdued Atom Dark border) */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 bg-canvas/30 p-1.5 rounded-xl border border-tile-border/40 dark:border-white/[0.04] shrink-0">
        {/* Quick Folder Switchers */}
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          <button
            onClick={() => setActiveFolderFilter('all')}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-medium transition-colors cursor-pointer ${
              activeFolderFilter === 'all'
                ? 'bg-primary text-on-primary'
                : 'bg-tile-subtle/60 hover:bg-tile-subtle text-on-surface-variant border border-tile-border dark:border-white/[0.05]'
            }`}
          >
            Все темы ({streamItems.length})
          </button>

          {availableFolders.map((folderPath) => {
            const theme = getSparkFolderTheme(folderPath);
            const isSelected = activeFolderFilter === folderPath;
            return (
              <button
                key={folderPath}
                onClick={() => setActiveFolderFilter(folderPath)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-medium flex items-center gap-1 transition-colors cursor-pointer border ${
                  isSelected
                    ? 'border-primary/50 text-on-surface'
                    : 'border-tile-border dark:border-white/[0.05] bg-tile-subtle/60 hover:bg-tile-subtle text-on-surface-variant'
                }`}
                style={{
                  backgroundColor: isSelected ? theme.badgeBg : undefined,
                  color: isSelected ? theme.accentColor : undefined,
                }}
              >
                <span>{theme.emoji}</span>
                <span>{theme.cleanName}</span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-40">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-outline/60" />
          <input
            type="text"
            placeholder="Поиск по файлу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-control border border-control-border dark:border-white/[0.06] rounded-lg pl-6 pr-2 h-6 text-[10px] font-mono text-on-surface placeholder:text-outline/60 outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* 3. Stream List Cards (Subdued Atom Dark dividers) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-tile-border/60 dark:divide-white/[0.05] pr-1 min-h-0">
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant text-xs font-mono">
            {isLoading ? 'Загрузка обновлений...' : 'Нет обновлений по выбранному фильтру.'}
          </div>
        ) : (
          filteredItems.map(({ note, fileName, folderPath, theme, status, updatedAt }) => {
            const mainImage = note.images && note.images.length > 0
              ? note.images.find((img) => img.isMain) || note.images[0]
              : null;

            const thumbUrl = mainImage
              ? mainImage.thumbnailUrl
                ? mainImage.thumbnailUrl.startsWith('http')
                  ? mainImage.thumbnailUrl
                  : `${apiBase}${mainImage.thumbnailUrl}`
                : mainImage.url.startsWith('http')
                ? mainImage.url
                : `${apiBase}${mainImage.url}`
              : null;

            const formattedTime = dayjs(updatedAt).fromNow();

            return (
              <div
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className="py-2 px-2 hover:bg-tile-subtle/50 rounded-xl transition-colors duration-150 cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                {/* Left & Center: Metadata & Title */}
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {/* Thumbnail or File icon */}
                  {thumbUrl ? (
                    <div className="relative w-9 h-9 flex-shrink-0 rounded-lg overflow-hidden bg-tile-subtle border border-tile-border dark:border-white/[0.06] shadow-xs mt-0.5">
                      <img
                        src={thumbUrl}
                        alt={note.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="w-9 h-9 flex-shrink-0 rounded-lg bg-tile-subtle/60 border border-tile-border dark:border-white/[0.06] flex items-center justify-center text-primary mt-0.5 transition-colors">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    {/* Top Meta Line: File Name + Spark Theme Badge + Sync Badge */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono mb-0.5">
                      {/* Theme pill */}
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-medium border border-white/[0.06]"
                        style={{
                          backgroundColor: theme.badgeBg,
                          color: theme.accentColor,
                        }}
                      >
                        <span>{theme.emoji}</span>
                        <span>{theme.cleanName}</span>
                      </span>

                      {/* Spark .md file name */}
                      <span className="text-on-surface-variant/80 font-mono truncate max-w-[190px]" title={fileName}>
                        📄 {fileName}
                      </span>

                      {/* Sync Status Badge */}
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Synced Spark</span>
                      </span>

                      <span className="text-outline/60 text-[9px]">
                        • {formattedTime}
                      </span>
                    </div>

                    {/* Note Title with Type Badge */}
                    <div className="flex items-center gap-1.5">
                      <NoteTypeBadge type={note.type} size="sm" />
                      <h3 className="font-sans font-semibold text-xs sm:text-sm text-on-surface group-hover:text-primary transition-colors truncate">
                        {note.title}
                      </h3>
                    </div>

                    {/* Note Summary / Hashtags */}
                    <div className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant/70 mt-0.5 flex-wrap">
                      {note.summary && (
                        <p className="text-[11px] text-on-surface-variant/80 line-clamp-1 max-w-xl font-sans">
                          {note.summary}
                        </p>
                      )}

                      {note.hashtags && note.hashtags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {note.hashtags.slice(0, 3).map((h) => (
                            <HashtagBadge key={h.id} name={h.name} size="xs" />
                          ))}
                          {note.hashtags.length > 3 && (
                            <span className="text-[9px] text-cyan-400/80 font-mono">
                              +{note.hashtags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Quick Action Pill */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <span className="text-[10px] font-mono text-secondary hover:text-primary transition-colors hidden md:inline">
                    Инспектор
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-tile-subtle/60 border border-tile-border dark:border-white/[0.06] flex items-center justify-center text-outline/50 group-hover:text-primary group-hover:border-primary/40 transition-colors">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
