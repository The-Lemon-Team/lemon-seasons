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
    <div className="rounded-xl border border-white/10 bg-surface-container-high/60 backdrop-blur-sm p-5 shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Watcher identity & Path */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isWatching ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span className="font-sans font-bold text-base text-on-surface">
                Слушатель Gemini Sparks & Google Drive
              </span>
            </div>
            <Tag
              color={isWatching ? 'success' : 'error'}
              className="font-mono text-[11px] uppercase tracking-wider font-semibold border-none px-2 py-0.5"
            >
              {isWatching ? 'АКТИВЕН' : 'ОСТАНОВЛЕН'}
            </Tag>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant">
            <span className="text-outline">Папка:</span>
            <span className="bg-black/40 px-2 py-0.5 rounded border border-white/5 text-primary break-all">
              {status?.watchedDir || 'Директория инициализируется...'}
            </span>
          </div>
        </div>

        {/* Right: Metrics Counters & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Metrics Pills */}
          <div className="flex items-center gap-2 bg-black/30 border border-white/5 rounded-lg p-1.5 text-xs font-mono">
            <Tooltip title="Успешно импортированные файлы в базу Notes">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{status?.filesProcessed ?? 0}</span>
                <span className="text-[10px] text-emerald-500/70 font-normal">готово</span>
              </div>
            </Tooltip>

            <Tooltip title="Файлы в очереди на парсинг и сохранение">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>{status?.filesPending ?? 0}</span>
                <span className="text-[10px] text-amber-500/70 font-normal">в очереди</span>
              </div>
            </Tooltip>

            <Tooltip title="Файлы с ошибками синтаксиса или блокировкой">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{status?.filesFailed ?? 0}</span>
                <span className="text-[10px] text-rose-500/70 font-normal">ошибок</span>
              </div>
            </Tooltip>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="default"
              icon={<FolderSearch className="w-4 h-4 text-primary" />}
              loading={isScanning}
              onClick={onScan}
              className="border-white/10 hover:border-primary/50 text-on-surface font-sans text-xs flex items-center gap-1.5"
            >
              Сканировать папку
            </Button>

            <Button
              type="primary"
              icon={<PlusCircle className="w-4 h-4" />}
              onClick={onCreateSparkClick}
              className="bg-primary hover:bg-primary-hover text-on-primary font-sans text-xs font-semibold flex items-center gap-1.5"
            >
              Создать тест Spark
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
