import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tooltip, message } from 'antd';
import { RefreshCw, Sparkles } from 'lucide-react';
import { syncApi } from '../api/client';
import { useGDriveUpdates } from '../api/queries';
import { SyncStatusResponse } from '../types';
import { GDriveUpdatesPopover } from './GDriveUpdatesPopover';

const STORAGE_LAST_SEEN_KEY = 'lemon_gdrive_last_seen_sync';

export const WorkstationSyncBar: React.FC = () => {
  const queryClient = useQueryClient();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastKnownIdsRef = useRef<Set<string>>(new Set());

  // 1. Sync Status Query
  const { data: syncStatus, isLoading: isStatusLoading } = useQuery<SyncStatusResponse>({
    queryKey: ['sync-status'],
    queryFn: () => syncApi.getStatus(),
    refetchInterval: 10000,
  });

  // 2. Recent GDrive Updates Query (Sparks, Commits, Ingested Files)
  const { data: updatesData, isLoading: isUpdatesLoading } = useGDriveUpdates(25, 10000);
  const updates = updatesData?.items || [];

  // Track unread/new updates coming automatically from Google Drive
  useEffect(() => {
    if (updates.length === 0) return;

    const savedLastSeenStr = localStorage.getItem(STORAGE_LAST_SEEN_KEY);
    const lastSeenTime = savedLastSeenStr ? parseInt(savedLastSeenStr, 10) : 0;

    // Count items updated after lastSeenTime
    const newItems = updates.filter(
      (u) => new Date(u.updatedAt).getTime() > lastSeenTime
    );

    setUnreadCount(newItems.length);

    // Check if new items arrived automatically in background (compare with previous known IDs)
    if (lastKnownIdsRef.current.size > 0) {
      const brandNew = newItems.filter((i) => !lastKnownIdsRef.current.has(i.id));
      if (brandNew.length > 0) {
        message.info({
          content: `📥 Google Drive: получено ${brandNew.length} новых файлов и обновлений`,
          key: 'gdrive-auto-sync',
          duration: 4,
        });
      }
    }

    lastKnownIdsRef.current = new Set(updates.map((u) => u.id));
  }, [updates]);

  const handleOpenPopover = () => {
    setIsPopoverOpen((prev) => !prev);
    // Mark as read
    localStorage.setItem(STORAGE_LAST_SEEN_KEY, String(Date.now()));
    setUnreadCount(0);
  };

  const unpushedCount = syncStatus?.gdrive?.unpushedCommitsCount ?? 0;

  // 3. Manual Sync Mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (unpushedCount > 0) {
        await syncApi.push();
      }
      return syncApi.pull();
    },
    onSuccess: (result) => {
      const pulledCount = result.pulledCommits?.length ?? 0;
      const newFilesCount = result.newUpdates?.length ?? 0;

      if (pulledCount > 0 || newFilesCount > 0) {
        message.success(
          `Синхронизировано: ${pulledCount > 0 ? `${pulledCount} коммитов` : ''} ${
            newFilesCount > 0 ? `${newFilesCount} недавних файлов` : ''
          } из Google Drive`
        );
        // Automatically open the popover to show incoming files
        setIsPopoverOpen(true);
        localStorage.setItem(STORAGE_LAST_SEEN_KEY, String(Date.now()));
        setUnreadCount(0);
      } else {
        message.success('Синхронизация с Google Drive выполнена. Все файлы актуальны.');
      }

      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['sync-updates'] });
      queryClient.invalidateQueries({ queryKey: ['ingestion-files'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
    onError: (err: any) => {
      message.error(`Ошибка синхронизации: ${err.message || err}`);
    },
  });

  const formatSyncTime = (dateStr?: string) => {
    if (!dateStr) return 'Актуально';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isStatusLoading || !syncStatus) {
    return null;
  }

  const isPending = syncMutation.isPending;

  return (
    <div className="relative flex items-center">
      {/* Control Pill */}
      <div className="h-7 flex items-center gap-1 bg-[#0c0e12]/80 hover:bg-[#0c0e12] border border-white/[0.08] rounded-lg p-0.5 text-xs transition-colors">
        {/* GDrive Connection & Popover Trigger */}
        <Tooltip
          title={
            syncStatus.lastCommit?.createdAt
              ? `Google Drive • Последнее обновление: ${formatSyncTime(
                  syncStatus.lastCommit.createdAt
                )} (кликните для просмотра недавних файлов)`
              : 'Google Drive подключен (кликните для просмотра недавних файлов)'
          }
        >
          <button
            onClick={handleOpenPopover}
            className="h-6 flex items-center gap-1.5 px-2 rounded hover:bg-white/5 transition-colors cursor-pointer text-left"
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

            {/* Unpushed commits badge */}
            {unpushedCount > 0 && (
              <span
                className="bg-amber-500/20 text-amber-400 font-mono text-[10px] px-1.5 py-0.2 rounded font-semibold"
                title={`Ожидает выгрузки: ${unpushedCount}`}
              >
                ↑{unpushedCount}
              </span>
            )}
          </button>
        </Tooltip>

        <div className="h-3.5 w-[1px] bg-white/[0.08] mx-0.5" />

        {/* Sync Button (matches yellow button in screenshot) */}
        <button
          onClick={() => syncMutation.mutate()}
          disabled={isPending}
          className="h-6 flex items-center gap-1.5 px-2.5 rounded bg-[#c9cd58] text-[#121414] hover:bg-[#dce06b] transition-all font-mono font-semibold text-[11px] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
          title="Синхронизировать данные с Google Drive"
        >
          <RefreshCw
            className={`w-3 h-3 shrink-0 ${isPending ? 'animate-spin' : ''}`}
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
        onSyncNow={() => syncMutation.mutate()}
        isSyncing={isPending}
      />
    </div>
  );
};

export const WorkstationSessionBar = WorkstationSyncBar;
