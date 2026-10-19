import React from 'react';
import { Button, Tooltip, Tag } from 'antd';
import { RefreshCw, FolderSearch, PlusCircle, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { WatcherStatus } from '../../../api/client';

interface WatcherStatusCardProps {
  status?: WatcherStatus | null;
  isLoading: boolean;
  isScanning: boolean;
  onScan: () => void;
  onCreateSparkClick: () => void;
}

export const WatcherStatusCard: React.FC<WatcherStatusCardProps> = ({
  status,
  isLoading,
  isScanning,
  onScan,
  onCreateSparkClick,
}) => {
  const isWatching = status?.isWatching ?? false;

  return (
    <div className="platform-tile p-3 sm:p-3.5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Watcher identity & Path */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isWatching ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span className="font-sans font-bold text-xs text-on-surface">
                Слушатель Gemini Sparks & Google Drive
              </span>
            </div>
            <Tag
              color={isWatching ? 'success' : 'error'}
              className="font-mono text-[10px] uppercase tracking-wider font-semibold border-none px-1.5 py-0 m-0"
            >
              {isWatching ? 'АКТИВЕН' : 'ОСТАНОВЛЕН'}
            </Tag>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-on-surface-variant">
            <span className="text-outline">Папка:</span>
            <span className="bg-tile-subtle px-2 py-0.5 rounded border border-tile-border text-primary break-all">
              {status?.watchedDir || 'Директория инициализируется...'}
            </span>
          </div>
        </div>

        {/* Right: Metrics Counters & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metrics Pills */}
          <div className="flex items-center gap-1.5 bg-tile-subtle border border-tile-border rounded-lg p-1 text-xs font-mono">
            <Tooltip title="Успешно импортированные файлы в базу Notes">
              <div className="flex items-center gap-1.5 h-6 px-2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                <CheckCircle2 className="w-3 h-3" />
                <span>{status?.filesProcessed ?? 0}</span>
                <span className="text-[9px] text-emerald-600/70 dark:text-emerald-500/70 font-normal">готово</span>
              </div>
            </Tooltip>

            <Tooltip title="Файлы в очереди на парсинг и сохранение">
              <div className="flex items-center gap-1.5 h-6 px-2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-[10px]">
                <Clock className="w-3 h-3" />
                <span>{status?.filesPending ?? 0}</span>
                <span className="text-[9px] text-amber-600/70 dark:text-amber-500/70 font-normal">в очереди</span>
              </div>
            </Tooltip>

            <Tooltip title="Файлы с ошибками синтаксиса или блокировкой">
              <div className="flex items-center gap-1.5 h-6 px-2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-[10px]">
                <AlertTriangle className="w-3 h-3" />
                <span>{status?.filesFailed ?? 0}</span>
                <span className="text-[9px] text-rose-600/70 dark:text-rose-500/70 font-normal">ошибок</span>
              </div>
            </Tooltip>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              type="default"
              icon={<FolderSearch className="w-3.5 h-3.5 text-primary" />}
              loading={isScanning}
              onClick={onScan}
              className="h-6.5 border-tile-border hover:border-primary text-on-surface font-sans text-[11px] flex items-center gap-1.5 px-2.5 rounded-lg"
            >
              Сканировать
            </Button>

            <Button
              type="primary"
              icon={<PlusCircle className="w-3.5 h-3.5" />}
              onClick={onCreateSparkClick}
              className="h-6.5 bg-primary hover:bg-primary-hover text-on-primary font-sans text-[11px] font-semibold flex items-center gap-1.5 px-2.5 rounded-lg shadow-sm"
            >
              Создать Spark
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
