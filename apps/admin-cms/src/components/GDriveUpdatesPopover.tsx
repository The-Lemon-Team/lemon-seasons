import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cloud,
  FileText,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  ExternalLink,
  Folder,
  Calendar,
} from 'lucide-react';
import { GDriveUpdateItem, SyncStatusResponse } from '../types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';

dayjs.extend(relativeTime);
dayjs.locale('ru');

interface GDriveUpdatesPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  updates: GDriveUpdateItem[];
  isLoading: boolean;
  syncStatus?: SyncStatusResponse | null;
  onSyncNow: () => void;
  isSyncing: boolean;
}

export const GDriveUpdatesPopover: React.FC<GDriveUpdatesPopoverProps> = ({
  isOpen,
  onClose,
  updates,
  isLoading,
  syncStatus,
  onSyncNow,
  isSyncing,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = dayjs(dateStr);
    const now = dayjs();
    if (now.diff(d, 'hour') < 24) {
      return d.fromNow();
    }
    return d.format('DD.MM HH:mm');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'PULLED':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Готово
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            В обработке
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Clock className="w-2.5 h-2.5" />
            В очереди
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-500/15 text-red-400 border border-red-500/30">
            <AlertCircle className="w-2.5 h-2.5" />
            Ошибка
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/10 text-on-surface-variant">
            {status}
          </span>
        );
    }
  };

  const handleItemClick = (item: GDriveUpdateItem) => {
    if (item.noteId) {
      navigate(`/notes/${item.noteId}`);
      onClose();
    } else {
      navigate('/generators');
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop with subtle dimming to isolate popover from dashboard widgets */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Popover Card with solid opaque background */}
      <div
        className="absolute right-0 top-10 z-50 w-96 max-w-[calc(100vw-2rem)] border border-tile-border rounded-2xl shadow-2xl p-3.5 text-xs font-sans animate-in fade-in slide-in-from-top-2 ring-1 ring-black/10 dark:ring-white/10"
        style={{ backgroundColor: 'var(--panel-bg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-tile-border">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-primary-container text-primary">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-on-surface text-xs leading-tight">
                Google Drive обновления
              </h4>
              <p className="text-[10px] font-mono text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                В сети (Relay) • C:\remote
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded hover:bg-tile-subtle transition-colors cursor-pointer"
            title="Закрыть"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status Meta summary */}
        {syncStatus && (
          <div
            className="py-2 px-2.5 my-2 rounded-lg border border-tile-border flex items-center justify-between text-[10px] font-mono"
            style={{ backgroundColor: 'var(--tile-bg-subtle)' }}
          >
            <span className="text-on-surface-variant">Последняя синхронизация:</span>
            <span className="text-on-surface font-semibold">
              {syncStatus.lastSyncAt || syncStatus.lastCommit?.createdAt
                ? dayjs(syncStatus.lastSyncAt || syncStatus.lastCommit?.createdAt).format('HH:mm:ss')
                : 'Только что'}
            </span>
          </div>
        )}

        {/* Section Title */}
        <div className="flex items-center justify-between mb-2 mt-1">
          <span className="font-semibold text-xs text-on-surface flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" />
            Недавние файлы и заметки ({updates.length})
          </span>
          {isLoading && <RefreshCw className="w-3 h-3 text-primary animate-spin" />}
        </div>

        {/* Updates Scrollable List */}
        <div className="max-h-72 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
          {updates.length === 0 ? (
            <div className="py-8 text-center text-on-surface-variant space-y-1.5">
              <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500 mb-2" />
              <p className="font-semibold text-xs text-on-surface">Новых файлов пока нет</p>
              <p className="text-[10px] font-mono">Все заметки с Google Drive синхронизированы</p>
            </div>
          ) : (
            updates.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="p-2 rounded-lg hover:border-primary/40 border border-tile-border transition-all cursor-pointer group"
                style={{ backgroundColor: 'var(--tile-bg-subtle)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="p-1 rounded bg-primary-container text-primary mt-0.5 shrink-0">
                      {item.source === 'SPARKS' ? (
                        <Sparkles className="w-3 h-3" />
                      ) : (
                        <FileText className="w-3 h-3" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-on-surface truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </p>
                      <p className="font-mono text-[10px] text-on-surface-variant truncate">
                        {item.fileName}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">{getStatusBadge(item.status)}</div>
                </div>

                {/* Meta Row: Folder, Type, Time */}
                <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono text-on-surface-variant/80 border-t border-tile-border pt-1">
                  <div className="flex items-center gap-2 truncate">
                    {item.folderPath && (
                      <span className="inline-flex items-center gap-1 text-on-surface-variant">
                        <Folder className="w-2.5 h-2.5" />
                        {item.folderPath}
                      </span>
                    )}
                    {item.noteType && (
                      <span className="px-1 rounded bg-tile-muted text-primary">
                        {item.noteType}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 flex items-center gap-1 text-on-surface-variant">
                    <Calendar className="w-2.5 h-2.5" />
                    {formatTime(item.updatedAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-2.5 mt-2.5 border-t border-tile-border">
          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary-hover font-mono font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Синхронизация...' : 'Синхронизировать сейчас'}</span>
          </button>

          <button
            onClick={() => {
              navigate('/generators');
              onClose();
            }}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-control hover:bg-tile-subtle text-on-surface border border-control-border text-xs font-mono transition-colors cursor-pointer"
            title="Открыть панель Ingestion Lab"
          >
            <span>Lab</span>
            <ExternalLink className="w-3 h-3 text-on-surface-variant" />
          </button>
        </div>
      </div>
    </>
  );
};
