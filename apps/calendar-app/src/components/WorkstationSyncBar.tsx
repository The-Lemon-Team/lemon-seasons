import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cloud,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { syncApi } from '../api/client';
import { SyncStatusResponse } from '@lenta/shared';

export const WorkstationSyncBar: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const { data: syncStatus, isLoading } = useQuery<SyncStatusResponse>({
    queryKey: ['sync-status'],
    queryFn: () => syncApi.getStatus(),
    refetchInterval: 10000,
  });

  const showToast = (text: string, type: 'success' | 'info' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const pullMutation = useMutation({
    mutationFn: () => syncApi.pull(),
    onSuccess: (result) => {
      if (result.pulledCommits && result.pulledCommits.length > 0) {
        showToast(`Подтянуты свежие обновления из Google Drive!`, 'success');
      } else {
        showToast('Все наработки актуальны. Данные синхронизированы.', 'info');
      }
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['time-slice-notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
    onError: (err: any) => {
      showToast(`Ошибка синхронизации: ${err.message || 'Сбой сети'}`, 'error');
    },
  });

  const unpushedCount = syncStatus?.gdrive?.unpushedCommitsCount ?? 0;

  if (isLoading || !syncStatus) {
    return null;
  }

  const formatSyncDate = (dateStr?: string) => {
    if (!dateStr) return 'Актуально';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative flex items-center">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`absolute top-10 right-0 z-50 flex items-center gap-2 px-3 py-2 rounded-lg shadow-xl border text-xs font-sans whitespace-nowrap transition-all animate-in fade-in slide-in-from-top-1 ${
            toastMessage.type === 'success'
              ? 'bg-[#1a2e1d] border-[#22c55e]/40 text-[#86efac]'
              : toastMessage.type === 'error'
              ? 'bg-[#2e1a1a] border-[#ef4444]/40 text-[#fca5a5]'
              : 'bg-[#1e2020] border-[#c9cd58]/30 text-[#e2e2e2]'
          }`}
        >
          {toastMessage.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />}
          {toastMessage.type === 'error' && <AlertCircle className="w-3.5 h-3.5 text-[#ef4444]" />}
          {toastMessage.type === 'info' && <Cloud className="w-3.5 h-3.5 text-[#c9cd58]" />}
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
      <div className="flex items-center gap-1.5 bg-[#1a1d1d] hover:bg-[#1e2222] border border-[#2e3434] rounded-lg px-2.5 py-1 text-xs transition-colors">
        {/* Status Indicator & Popover trigger */}
        <button
          onClick={() => setIsDetailsOpen((prev) => !prev)}
          className="flex items-center gap-1.5 text-[#93927e] hover:text-[#e2e2e2] transition-colors cursor-pointer"
          title="Сведения о синхронизации Google Drive"
        >
          <span className="relative flex h-2 w-2">
            {pullMutation.isPending ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c9cd58] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#c9cd58]"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]"></span>
            )}
          </span>

          <span className="font-mono text-[11px] text-[#e2e2e2]">GDrive</span>

          {unpushedCount > 0 && (
            <span
              className="bg-amber-500/20 text-amber-400 font-mono text-[9px] px-1 rounded"
              title={`Ожидает выгрузки: ${unpushedCount}`}
            >
              ↑{unpushedCount}
            </span>
          )}
        </button>

        <div className="h-3 w-[1px] bg-[#2e3434] mx-0.5" />

        {/* Refresh / Pull Button */}
        <button
          onClick={() => pullMutation.mutate()}
          disabled={pullMutation.isPending}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5 text-[#c9cd58] hover:text-[#e5e971] transition-all font-mono text-[11px] cursor-pointer disabled:opacity-50"
          title="Подтянуть свежие наработки из Google Drive"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${pullMutation.isPending ? 'animate-spin text-[#c9cd58]' : ''}`}
          />
          <span className="hidden md:inline font-sans text-[11px]">
            {pullMutation.isPending ? 'Обновление...' : 'Обновить'}
          </span>
        </button>
      </div>

      {/* Details Dropdown / Popover */}
      {isDetailsOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsDetailsOpen(false)}
          />
          <div className="absolute right-0 top-11 z-50 w-80 bg-[#161818] border border-[#2e3434] rounded-xl shadow-2xl p-4 text-xs font-sans animate-in fade-in slide-in-from-top-2">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#242828]">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-[#c9cd58]" />
                <span className="font-semibold text-[#e2e2e2] text-sm">Синхронизация Google Drive</span>
              </div>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="text-[#93927e] hover:text-[#e2e2e2] p-1 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Information Grid */}
            <div className="py-3 space-y-2.5 font-mono text-[11px]">
              <div className="flex justify-between items-center text-[#93927e]">
                <span>Статус подключения:</span>
                <span className="text-[#22c55e] flex items-center gap-1 font-sans font-medium text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></span>
                  В сети (Relay)
                </span>
              </div>

              <div className="flex justify-between items-center text-[#93927e]">
                <span>Хранилище:</span>
                <span className="text-[#e2e2e2] bg-[#1e2020] px-1.5 py-0.5 rounded border border-[#242828] text-[10px]">
                  C:\remote
                </span>
              </div>

              <div className="flex justify-between items-center text-[#93927e]">
                <span>Устройство:</span>
                <span className="text-[#c9cd58]">{syncStatus.deviceId}</span>
              </div>

              {syncStatus.lastCommit?.createdAt && (
                <div className="flex justify-between items-center text-[#93927e]">
                  <span>Последнее обновление:</span>
                  <span className="text-[#e2e2e2]">{formatSyncDate(syncStatus.lastCommit.createdAt)}</span>
                </div>
              )}

              {unpushedCount > 0 && (
                <div className="flex justify-between items-center text-[#93927e]">
                  <span>Ожидает выгрузки:</span>
                  <span className="text-amber-400 font-semibold">{unpushedCount}</span>
                </div>
              )}
            </div>

            {/* Role Context Explanation */}
            <div className="bg-[#121414] border border-[#242828] rounded-lg p-2.5 mb-3 text-[11px] text-[#93927e] leading-relaxed">
              💡 <span className="text-[#e2e2e2] font-semibold">Web Calendar App</span> используется для просмотра заметок. Редактирование и работа с AI-агентами ведутся в <span className="text-[#c9cd58] font-semibold">Admin CMS</span>.
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1 border-t border-[#242828]">
              <button
                onClick={() => {
                  pullMutation.mutate();
                  setIsDetailsOpen(false);
                }}
                disabled={pullMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c9cd58] text-[#121414] hover:bg-[#dce06b] font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${pullMutation.isPending ? 'animate-spin' : ''}`} />
                <span>Обновить наработки</span>
              </button>

              <a
                href="http://localhost:5173"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#e2e2e2] border border-[#242828] text-xs transition-colors"
                title="Открыть Admin CMS для работы с агентами и заметками"
              >
                <span>Admin CMS</span>
                <ExternalLink className="w-3 h-3 text-[#93927e]" />
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
