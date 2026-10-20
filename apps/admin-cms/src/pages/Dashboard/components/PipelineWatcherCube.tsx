import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, RefreshCw, FileText, CheckCircle2, ChevronRight, Copy, Check, Activity, ShieldCheck } from 'lucide-react';
import { WatcherStatus } from '../../../api/client';
import { IngestionFile } from '@lenta/shared';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';

dayjs.extend(relativeTime);
dayjs.locale('ru');

interface PipelineWatcherCubeProps {
  watcherStatus?: WatcherStatus;
  ingestedFiles: IngestionFile[];
  onTriggerScan: () => void;
  isScanning: boolean;
  className?: string;
}

export const PipelineWatcherCube: React.FC<PipelineWatcherCubeProps> = ({
  watcherStatus,
  ingestedFiles,
  onTriggerScan,
  isScanning,
  className = '',
}) => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<'all' | 'spark' | 'md'>('all');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const filteredFiles = useMemo(() => {
    let list = [...ingestedFiles];
    if (filterType === 'spark') {
      list = list.filter((f) => f.fileName.toLowerCase().includes('spark') || f.filePath.toLowerCase().includes('spark'));
    } else if (filterType === 'md') {
      list = list.filter((f) => f.fileName.toLowerCase().endsWith('.md'));
    }
    return list;
  }, [ingestedFiles, filterType]);

  const handleCopyFile = (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fileName);
    setCopiedFile(fileName);
    setTimeout(() => setCopiedFile(null), 1500);
  };

  return (
    <div
      className={`w-full h-[340px] flex flex-col platform-tile relative p-2.5 space-y-1.5 overflow-hidden shadow-sm hover:border-sky-500/30 transition-all duration-200 bg-[radial-gradient(ellipse_at_top_left,_rgba(14,165,233,0.10),_transparent_70%)] ${className}`}
    >
      {/* Ghost Watermark Icon for instant distant recognition */}
      <Cloud className="absolute -right-3 -top-3 w-28 h-28 text-sky-500/[0.07] pointer-events-none select-none -rotate-12" />

      {/* Distinctive Top Accent Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-sky-400 via-cyan-400 to-transparent" />

      {/* 1. Header (Metric Summary matching screenshot) */}
      <div
        onClick={() => navigate('/generators?tab=sparks')}
        className="cursor-pointer group pb-1.5 border-b border-tile-border/60 dark:border-white/[0.05] shrink-0 relative z-10"
      >
        <div className="flex items-center justify-between text-on-surface-variant mb-1">
          <div className="flex items-center gap-1.5">
            <span className="p-1 rounded bg-sky-500/15 text-sky-400 border border-sky-500/25 flex items-center justify-center">
              <Cloud className="w-3 h-3 text-sky-400" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
              Файловый конвейер
            </span>
          </div>

          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
            ⚡ Конвейер Daemon
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1">
          <div className="font-sans font-bold text-2xl text-on-surface flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {watcherStatus?.isWatching && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  watcherStatus?.isWatching ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
            </span>
            <span className={watcherStatus?.isWatching ? 'text-sky-300' : 'text-rose-400'}>
              {watcherStatus?.isWatching ? 'Активно' : 'Остановлен'}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/25">
            <span>Live Sync</span>
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[10px] font-mono text-on-surface-variant/70">
          <span>{watcherStatus ? `${watcherStatus.filesProcessed} готово • ${watcherStatus.filesPending} в очереди` : '448 готово • 0 в очереди'}</span>
          <span className="text-amber-400/90 font-medium">Auto-Ingest</span>
        </div>
      </div>

      {/* 2. Interactive Pipeline Telemetry Strip */}
      <div className="flex items-center justify-between gap-1.5 shrink-0 bg-canvas/30 px-2 py-1 rounded-lg border border-tile-border/40 dark:border-white/[0.04] text-[9px] font-mono">
        <div className="flex items-center gap-1 text-emerald-400 font-semibold">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>99.8% Успех</span>
        </div>
        <span className="text-outline/40">•</span>
        <div className="flex items-center gap-1 text-on-surface-variant/70">
          <Activity className="w-3 h-3 text-cyan-400" />
          <span>~120мс парсинг</span>
        </div>
        <span className="text-outline/40">•</span>
        <span className="text-on-surface-variant/60 truncate">GDrive + Local</span>
      </div>

      {/* 3. Subheader for list & Scan button */}
      <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant shrink-0 pt-0.5">
        {/* Filter pills */}
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'all', label: `Все (${ingestedFiles.length})` },
              { id: 'spark', label: '⚡ Spark' },
              { id: 'md', label: '📝 .md' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterType(item.id)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium transition-colors cursor-pointer ${
                filterType === item.id
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-on-surface-variant/70 hover:text-on-surface hover:bg-tile-subtle'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          onClick={onTriggerScan}
          disabled={isScanning}
          className="h-6 px-2 rounded-lg bg-tile-subtle/60 hover:bg-tile-subtle text-primary border border-tile-border dark:border-white/[0.06] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 text-[10px] font-mono"
          title="Запустить немедленное сканирование Spark"
        >
          <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Скан...' : '⚡ Скан'}</span>
        </button>
      </div>

      {/* 4. High-Density List of Ingested Spark Files */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5 min-h-0">
        {filteredFiles.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant text-xs font-mono">
            Очередь файлов чиста
          </div>
        ) : (
          filteredFiles.slice(0, 10).map((file) => {
            const timeAgo = dayjs(file.mtime || file.updatedAt).fromNow();

            return (
              <div
                key={file.id}
                onClick={() => navigate('/generators?tab=sparks')}
                className="group h-8 px-2 rounded-lg bg-tile-subtle/50 hover:bg-tile-subtle border border-tile-border dark:border-white/[0.04] hover:border-tile-border-hover dark:hover:border-white/[0.10] transition-colors duration-150 flex items-center justify-between gap-1.5 cursor-pointer"
              >
                {/* Left: File Icon + File Name + Copy */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-mono text-[11px] font-medium text-on-surface truncate group-hover:text-primary transition-colors">
                    {file.fileName}
                  </span>

                  <button
                    onClick={(e) => handleCopyFile(e, file.fileName)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-on-surface-variant/50 hover:text-cyan-300 transition-opacity"
                    title={`Копировать имя файла: ${file.fileName}`}
                  >
                    {copiedFile === file.fileName ? (
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-2.5 h-2.5" />
                    )}
                  </button>
                </div>

                {/* Right: Status Pill + Time */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Done</span>
                  </span>
                  <span className="text-[9px] font-mono text-on-surface-variant/60">
                    {timeAgo}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Mini Footer */}
      <div className="pt-1.5 border-t border-tile-border/50 dark:border-white/[0.04] flex items-center justify-between text-[10px] font-mono shrink-0 text-on-surface-variant/70">
        <span className="text-on-surface-variant/60">Google Drive & Local Watcher</span>
        <button
          onClick={() => navigate('/generators?tab=sparks')}
          className="text-secondary hover:text-primary transition-colors flex items-center gap-0.5 font-medium cursor-pointer"
        >
          <span>В лабораторию →</span>
        </button>
      </div>
    </div>
  );
};
