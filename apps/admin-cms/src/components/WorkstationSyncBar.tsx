import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tooltip, message } from 'antd';
import { RefreshCw } from 'lucide-react';
import { syncApi } from '../api/client';
import { SyncStatusResponse } from '../types';

export const WorkstationSyncBar: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: syncStatus, isLoading } = useQuery<SyncStatusResponse>({
    queryKey: ['sync-status'],
    queryFn: () => syncApi.getStatus(),
    refetchInterval: 10000,
  });

  const unpushedCount = syncStatus?.gdrive?.unpushedCommitsCount ?? 0;

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (unpushedCount > 0) {
        await syncApi.push();
      }
      return syncApi.pull();
    },
    onSuccess: (result) => {
      if (result.pulledCommits && result.pulledCommits.length > 0) {
        message.success(`Подтянуто ${result.pulledCommits.length} обновлений из Google Drive`);
      } else {
        message.success('Синхронизация с Google Drive выполнена');
      }
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
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

  if (isLoading || !syncStatus) {
    return null;
  }

  const isPending = syncMutation.isPending;

  return (
    <div className="flex items-center gap-2 bg-surface-container-high/80 border border-white/10 rounded-lg px-3 py-1 text-xs">
      {/* GDrive Connection & Sync Status Indicator */}
      <Tooltip
        title={
          syncStatus.lastCommit?.createdAt
            ? `Google Drive на связи • Последнее обновление: ${formatSyncTime(syncStatus.lastCommit.createdAt)}`
            : 'Google Drive хранилище подключено (Relay)'
        }
      >
        <div className="flex items-center gap-2 cursor-default">
          <span className="relative flex h-2 w-2">
            {isPending ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            )}
          </span>
          <span className="font-mono text-on-surface truncate">GDrive</span>
          {unpushedCount > 0 && (
            <span
              className="bg-amber-500/20 text-amber-400 font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold"
              title={`Ожидает выгрузки: ${unpushedCount}`}
            >
              ↑{unpushedCount}
            </span>
          )}
        </div>
      </Tooltip>

      <div className="h-3 w-[1px] bg-white/10 mx-1" />

      {/* Sync Button */}
      <button
        onClick={() => syncMutation.mutate()}
        disabled={isPending}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary/20 text-primary hover:bg-primary hover:text-on-primary transition-all font-sans font-semibold text-[11px] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        title="Синхронизировать данные с Google Drive"
      >
        <RefreshCw
          className={`w-3.5 h-3.5 shrink-0 ${
            isPending ? 'animate-spin' : ''
          }`}
        />
        <span>{isPending ? 'Синхронизация...' : 'Синхронизировать'}</span>
      </button>
    </div>
  );
};

export const WorkstationSessionBar = WorkstationSyncBar;
