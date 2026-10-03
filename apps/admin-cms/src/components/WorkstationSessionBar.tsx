import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Input, message, Tooltip } from 'antd';
import { Save, RefreshCw } from 'lucide-react';
import { syncApi } from '../api/client';
import { SyncStatusResponse } from '../types';

export const WorkstationSessionBar: React.FC = () => {
  const queryClient = useQueryClient();
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [commitSummary, setCommitSummary] = useState('');

  const { data: syncStatus, isLoading } = useQuery<SyncStatusResponse>({
    queryKey: ['sync-status'],
    queryFn: () => syncApi.getStatus(),
    refetchInterval: 10000,
  });

  const commitMutation = useMutation({
    mutationFn: async ({ sessionId, summary }: { sessionId: string; summary: string }) => {
      return syncApi.commitSession(sessionId, { summary, autoPush: true });
    },
    onSuccess: (data) => {
      message.success(`Сессия зафиксирована и отправлена в Google Drive! Коммит: ${data.commit?.id?.slice(0, 8)}...`);
      setCommitModalOpen(false);
      setCommitSummary('');
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (err: any) => {
      message.error(`Ошибка фиксации сессии: ${err.message || err}`);
    },
  });

  const pullMutation = useMutation({
    mutationFn: () => syncApi.pull(),
    onSuccess: (result) => {
      if (result.pulledCommits.length > 0) {
        message.success(`Подтянуто ${result.pulledCommits.length} коммитов из Google Drive!`);
      } else {
        message.info('База данных актуальна, новых коммитов нет.');
      }
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    },
    onError: (err: any) => {
      message.error(`Ошибка синхронизации: ${err.message || err}`);
    },
  });

  const activeSession = syncStatus?.activeSession;
  const pendingCount = syncStatus?.pendingChangesCount ?? 0;
  const unpushedCount = syncStatus?.gdrive?.unpushedCommitsCount ?? 0;

  const handleOpenCommit = () => {
    if (!activeSession) {
      message.warning('Нет активной сессии для фиксации');
      return;
    }
    setCommitSummary(activeSession.title || '');
    setCommitModalOpen(true);
  };

  const handleConfirmCommit = () => {
    if (!activeSession) return;
    commitMutation.mutate({
      sessionId: activeSession.id,
      summary: commitSummary.trim(),
    });
  };

  if (isLoading || !syncStatus) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 bg-surface-container-high/80 border border-white/10 rounded-lg px-3 py-1 text-xs">
        {/* Active Session Badge */}
        <Tooltip
          title={
            activeSession
              ? `Активная сессия: ${activeSession.title} (создана ${new Date(activeSession.startedAt).toLocaleTimeString()})`
              : 'Сессия запускается автоматически при внесении правок'
          }
        >
          <div className="flex items-center gap-2 cursor-default">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="font-mono text-on-surface truncate max-w-[140px]">
              {activeSession ? activeSession.title : 'Live режим'}
            </span>
            {pendingCount > 0 && (
              <span className="bg-primary/20 text-primary font-mono px-1.5 py-0.2 rounded text-[10px] font-semibold">
                +{pendingCount}
              </span>
            )}
          </div>
        </Tooltip>

        <div className="h-3 w-[1px] bg-white/10 mx-1" />

        {/* Commit Session Button */}
        <button
          onClick={handleOpenCommit}
          disabled={commitMutation.isPending || !activeSession}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary/20 text-primary hover:bg-primary hover:text-on-primary transition-all font-sans font-semibold text-[11px] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          title="Зафиксировать сессию в коммит и запушить на Google Drive"
        >
          <Save className="w-3.5 h-3.5 shrink-0" />
          <span>{commitMutation.isPending ? 'Запись...' : 'Закоммитить'}</span>
        </button>

        {/* Pull / Sync Cloud Button */}
        <Tooltip
          title={
            syncStatus.lastCommit
              ? `Последний коммит: ${syncStatus.lastCommit.id.slice(0, 12)} (${syncStatus.lastCommit.entitiesCount} сущн.)`
              : 'Google Drive хранилище подключено'
          }
        >
          <button
            onClick={() => pullMutation.mutate()}
            disabled={pullMutation.isPending}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-on-surface transition-all font-mono text-[11px] cursor-pointer"
            title="Проверить и подтянуть свежие коммиты с Google Drive"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 shrink-0 ${
                pullMutation.isPending ? 'animate-spin text-primary' : ''
              }`}
            />
            <span>GDrive</span>
            {unpushedCount > 0 && (
              <span className="bg-amber-500/20 text-amber-400 font-mono text-[9px] px-1 rounded">
                ↑{unpushedCount}
              </span>
            )}
          </button>
        </Tooltip>
      </div>

      {/* Commit Confirmation Modal */}
      <Modal
        title="Зафиксировать сессию рабочей станции"
        open={commitModalOpen}
        onOk={handleConfirmCommit}
        onCancel={() => setCommitModalOpen(false)}
        confirmLoading={commitMutation.isPending}
        okText="Закоммитить и отправить на Google Drive"
        cancelText="Отмена"
        destroyOnClose
      >
        <div className="space-y-4 py-2 text-xs">
          <p className="text-on-surface-variant">
            Все изменения текущей сессии (новые и обновленные заметки, диалоги с агентами, добавленные ссылки) будут объединены в неизменяемый коммит и сохранены в локальный журнал и Google Drive.
          </p>
          <div>
            <label className="block font-semibold mb-1 text-on-surface">Описание коммита (Summary):</label>
            <Input.TextArea
              rows={3}
              value={commitSummary}
              onChange={(e) => setCommitSummary(e.target.value)}
              placeholder="Например: Анализ рынка нефти, 2 заметки типа DONE и 1 чат с Иваном Белым"
            />
          </div>
          <div className="bg-surface-container border border-white/5 p-3 rounded font-mono text-[11px] space-y-1">
            <div>Устройство: <span className="text-primary">{syncStatus.deviceId}</span></div>
            <div>Несохраненных правок: <span className="text-primary">{pendingCount}</span></div>
            <div>Синхронизация: <span className="text-secondary">Автоматический Push на Google Drive</span></div>
          </div>
        </div>
      </Modal>
    </>
  );
};
