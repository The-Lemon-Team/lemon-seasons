import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { syncApi, calendarApi } from '../api/client';
import { SyncStatusResponse, Note, GDriveRecentUpdatesResponse } from '@lenta/shared';
import { GDriveUpdatesPopover } from './GDriveUpdatesPopover';
import { NoteDetailModal } from './NoteDetailModal';

const STORAGE_LAST_SEEN_KEY = 'lemon_gdrive_last_seen_sync_calendar';

export const WorkstationSyncBar: React.FC = () => {
  const queryClient = useQueryClient();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  const lastKnownIdsRef = useRef<Set<string>>(new Set());

  // 1. GDrive Status Query
  const { data: syncStatus, isLoading: isStatusLoading } = useQuery<SyncStatusResponse>({
    queryKey: ['sync-status'],
    queryFn: () => syncApi.getStatus(),
    refetchInterval: 10000,
  });

  // 2. GDrive Recent Updates Query
  const { data: updatesData, isLoading: isUpdatesLoading } = useQuery<GDriveRecentUpdatesResponse>({
    queryKey: ['sync-updates'],
    queryFn: () => syncApi.getUpdates(25),
    refetchInterval: 10000,
  });

  const updates = updatesData?.items || [];

  const showToast = (text: string, type: 'success' | 'info' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Track unread updates from Google Drive (e.g. newly ingested in background)
  useEffect(() => {
    if (updates.length === 0) return;

    const savedLastSeenStr = localStorage.getItem(STORAGE_LAST_SEEN_KEY);
    const lastSeenTime = savedLastSeenStr ? parseInt(savedLastSeenStr, 10) : 0;

    const newItems = updates.filter(
      (u) => new Date(u.updatedAt).getTime() > lastSeenTime
    );

    setUnreadCount(newItems.length);

    // If new updates detected automatically in background
    if (lastKnownIdsRef.current.size > 0) {
      const brandNew = newItems.filter((i) => !lastKnownIdsRef.current.has(i.id));
      if (brandNew.length > 0) {
        showToast(
          `Google Drive: получено ${brandNew.length} новых обновлений`,
          'success'
        );
      }
    }

    lastKnownIdsRef.current = new Set(updates.map((u) => u.id));
  }, [updates]);

  const handleOpenPopover = () => {
    setIsPopoverOpen((prev) => !prev);
    localStorage.setItem(STORAGE_LAST_SEEN_KEY, String(Date.now()));
    setUnreadCount(0);
  };

  // 3. Manual Sync Mutation
  const pullMutation = useMutation({
    mutationFn: () => syncApi.pull(),
    onSuccess: (result) => {
      const pulledCount = result.pulledCommits?.length ?? 0;
      const newFilesCount = result.newUpdates?.length ?? 0;

      if (pulledCount > 0 || newFilesCount > 0) {
        showToast(
          `Подтянуты свежие обновления из Google Drive (${pulledCount > 0 ? `${pulledCount} коммитов` : ''} ${
            newFilesCount > 0 ? `${newFilesCount} файлов` : ''
          })`,
          'success'
        );
        setIsPopoverOpen(true);
        localStorage.setItem(STORAGE_LAST_SEEN_KEY, String(Date.now()));
        setUnreadCount(0);
      } else {
        showToast('Все наработки актуальны. Новых файлов в Google Drive нет.', 'info');
      }

      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['sync-updates'] });
      queryClient.invalidateQueries({ queryKey: ['time-slice-notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
    onError: (err: any) => {
      showToast(`Ошибка синхронизации: ${err.message || 'Сбой сети'}`, 'error');
    },
  });

  const handleSelectNote = async (noteId: string) => {
    try {
      const note = await calendarApi.getNoteById(noteId);
      if (note) {
        setSelectedNote(note);
      }
    } catch (err) {
      console.warn('Could not load note details:', err);
    }
  };

  const unpushedCount = syncStatus?.gdrive?.unpushedCommitsCount ?? 0;

  if (isStatusLoading || !syncStatus) {
    return null;
  }

  const isPending = pullMutation.isPending;

  return (
    <div className="relative flex items-center">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`absolute top-11 right-0 z-50 flex items-center gap-2 px-3 py-2 rounded-lg shadow-xl border text-xs font-sans whitespace-nowrap transition-all animate-in fade-in slide-in-from-top-1 ${
            toastMessage.type === 'success'
              ? 'bg-[#1a2e1d] border-[#22c55e]/40 text-[#86efac]'
              : toastMessage.type === 'error'
              ? 'bg-[#2e1a1a] border-[#ef4444]/40 text-[#fca5a5]'
              : 'bg-[#1e2020] border-[#c9cd58]/30 text-[#e2e2e2]'
          }`}
        >
          {toastMessage.type === 'success' && (
            <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />
          )}
          {toastMessage.type === 'error' && (
            <AlertCircle className="w-3.5 h-3.5 text-[#ef4444]" />
          )}
          {toastMessage.type === 'info' && (
            <Cloud className="w-3.5 h-3.5 text-[#c9cd58]" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-1 text-white/40 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Bar Wrapper */}
      <div className="flex items-center gap-1.5 bg-[#1a1d1d] hover:bg-[#1e2222] border border-[#2e3434] rounded-lg p-1 text-xs transition-colors">
        {/* Status Indicator & Popover Trigger */}
        <button
          onClick={handleOpenPopover}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 transition-colors cursor-pointer text-left"
          title="Сведения о синхронизации Google Drive (кликните для просмотра недавних файлов)"
        >
          <span className="relative flex h-2 w-2">
            {isPending ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c9cd58] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#c9cd58]"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]"></span>
            )}
          </span>

          <span className="font-mono text-[11px] text-[#e2e2e2] font-semibold">GDrive</span>

          {/* Unread / Incoming updates badge */}
          {unreadCount > 0 && (
            <span
              className="bg-[#22c55e]/20 text-[#86efac] border border-[#22c55e]/40 font-mono text-[9px] px-1.5 py-0.2 rounded-full font-bold animate-pulse"
              title={`Новых файлов с Google Drive: ${unreadCount}`}
            >
              +{unreadCount}
            </span>
          )}

          {/* Unpushed commits counter */}
          {unpushedCount > 0 && (
            <span
              className="bg-amber-500/20 text-amber-400 font-mono text-[9px] px-1 rounded font-semibold"
              title={`Ожидает выгрузки: ${unpushedCount}`}
            >
              ↑{unpushedCount}
            </span>
          )}
        </button>

        <div className="h-3.5 w-[1px] bg-[#2e3434] mx-0.5" />

        {/* Sync Button (matches yellow button in screenshot) */}
        <button
          onClick={() => pullMutation.mutate()}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#c9cd58] text-[#121414] hover:bg-[#dce06b] transition-all font-sans font-semibold text-[11px] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
          title="Синхронизировать данные с Google Drive"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 shrink-0 ${isPending ? 'animate-spin' : ''}`}
          />
          <span>{isPending ? 'Синхронизация...' : 'Синхронизировать'}</span>
        </button>
      </div>

      {/* Popover List of Recent Files */}
      <GDriveUpdatesPopover
        isOpen={isPopoverOpen}
        onClose={() => setIsPopoverOpen(false)}
        updates={updates}
        isLoading={isUpdatesLoading}
        syncStatus={syncStatus}
        onSyncNow={() => pullMutation.mutate()}
        isSyncing={isPending}
        onSelectNote={handleSelectNote}
      />

      {/* Note Detail Reader Modal when clicked from updates list */}
      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
        />
      )}
    </div>
  );
};
