import React from 'react';
import { Stream, Feed } from '@lenta/shared';
import { StreamTableRow } from './StreamTableRow';
import { Radio, RefreshCw } from 'lucide-react';

export interface StreamsTableProps {
  streams: Stream[];
  allFeeds: Feed[];
  isLoading: boolean;
  onOpenAnalytics: (stream: Stream) => void;
  onEdit: (stream: Stream) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
}

export const StreamsTable: React.FC<StreamsTableProps> = ({
  streams,
  allFeeds,
  isLoading,
  onOpenAnalytics,
  onEdit,
  onDelete,
  onCreateNew,
}) => {
  return (
    <div className="platform-tile flex flex-col flex-1 min-h-0 overflow-hidden shadow-xs border border-tile-border">
      {/* Scrollable Container for Table Content */}
      <div className="flex-1 overflow-auto min-h-0 relative custom-scrollbar">
        <div className="min-w-[840px] flex flex-col min-h-full">
          {/* Table Header (Sticky) */}
          <div className="sticky top-0 z-10 grid grid-cols-[2.4fr_1.1fr_1.1fr_2.4fr_1.4fr_80px_100px] gap-3 px-3.5 py-2 border-b border-tile-border bg-tile-subtle font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold select-none shadow-xs">
            <div>Стрим / Название</div>
            <div>Слаг (Slug)</div>
            <div>Контур</div>
            <div>Источники (Feeds)</div>
            <div>Фильтры (Tags / Folders)</div>
            <div>Заметок</div>
            <div className="text-right">Действия</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-tile-border flex-1">
            {streams.map((stream) => (
              <StreamTableRow
                key={stream.id}
                stream={stream}
                allFeeds={allFeeds}
                onOpenAnalytics={onOpenAnalytics}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>

          {/* Empty State */}
          {streams.length === 0 && !isLoading && (
            <div className="p-12 text-center text-on-surface-variant space-y-2.5 my-auto">
              <Radio className="w-10 h-10 text-text-muted mx-auto stroke-1" />
              <p className="font-sans text-sm text-text-main font-medium">Стримы не найдены</p>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Создайте первый тематический стрим для объединения лент и заметок.
              </p>
              <button
                type="button"
                onClick={onCreateNew}
                className="mt-2 px-3 py-1.5 bg-primary text-on-primary rounded text-xs font-semibold hover:bg-primary-fixed-dim transition-colors cursor-pointer"
              >
                + Создать стрим
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && streams.length === 0 && (
            <div className="p-12 text-center text-on-surface-variant space-y-2 my-auto">
              <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto" />
              <p className="font-sans text-xs text-on-surface-variant">Загрузка стримов...</p>
            </div>
          )}
        </div>
      </div>

      {/* Table Footer */}
      <div className="p-2 px-3.5 border-t border-tile-border bg-tile-subtle flex items-center justify-between text-[11px] font-mono text-on-surface-variant flex-shrink-0">
        <div>
          <span>Всего стримов: {streams.length}</span>
        </div>
        <div className="text-[10px] text-text-muted">
          Кликните по строке стрима для открытия детальной аналитики
        </div>
      </div>
    </div>
  );
};
