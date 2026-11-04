import React from 'react';
import { Stream, Feed } from '@lenta/shared';
import { Radio, Lock, Globe, BarChart2, Edit3, Trash2, ExternalLink, Hash, Folder } from 'lucide-react';
import { EXTERNAL_APP_URLS } from '../../../components/sidebar/sidebar.constants';

export interface StreamTableRowProps {
  stream: Stream;
  allFeeds: Feed[];
  onOpenAnalytics: (stream: Stream) => void;
  onEdit: (stream: Stream) => void;
  onDelete: (id: string) => void;
}

export const StreamTableRow: React.FC<StreamTableRowProps> = ({
  stream,
  allFeeds,
  onOpenAnalytics,
  onEdit,
  onDelete,
}) => {
  // Resolve feed objects
  const boundFeeds = (stream.feedIds || [])
    .map((id) => allFeeds.find((f) => f.id === id || f.slug === id))
    .filter(Boolean) as Feed[];

  const isPublic = stream.privacy === 'public';
  const visibleFeeds = boundFeeds.slice(0, 3);
  const extraFeedsCount = Math.max(0, boundFeeds.length - 3);

  const feedAppUrl = `${EXTERNAL_APP_URLS.feedApp}/?mode=${encodeURIComponent(stream.slug)}`;

  return (
    <div
      onClick={() => onOpenAnalytics(stream)}
      className="group grid grid-cols-[2.4fr_1.1fr_1.1fr_2.4fr_1.4fr_80px_100px] gap-3 px-3.5 py-2.5 items-center hover:bg-tile-subtle/70 transition-colors cursor-pointer text-xs"
    >
      {/* Stream Identity */}
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs text-sm"
          style={{
            backgroundColor: stream.color ? `${stream.color}25` : 'rgba(99, 102, 241, 0.15)',
            border: `1px solid ${stream.color || '#6366f1'}40`,
          }}
        >
          {stream.icon ? (
            <span>{stream.icon}</span>
          ) : (
            <Radio className="w-3.5 h-3.5 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
              {stream.title}
            </span>
            {stream.badge && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-primary/15 text-primary border border-primary/30 uppercase">
                {stream.badge}
              </span>
            )}
            {stream.isBuiltin && (
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">
                system
              </span>
            )}
          </div>
          {stream.description && (
            <p className="text-[11px] text-text-muted truncate mt-0.5">
              {stream.description}
            </p>
          )}
        </div>
      </div>

      {/* Slug */}
      <div className="min-w-0">
        <code className="text-[10px] font-mono bg-control px-1.5 py-0.5 rounded border border-control-border text-on-surface-variant truncate block max-w-fit">
          {stream.slug}
        </code>
      </div>

      {/* Privacy Contour */}
      <div>
        {isPublic ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Globe className="w-3 h-3" />
            <span>Public</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Lock className="w-3 h-3" />
            <span>Private</span>
          </span>
        )}
      </div>

      {/* Bound Feeds Chips */}
      <div className="flex items-center gap-1 flex-wrap min-w-0">
        {boundFeeds.length === 0 ? (
          <span className="text-[10px] text-text-muted italic">Все ленты (Auto)</span>
        ) : (
          <>
            {visibleFeeds.map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-control border border-control-border text-on-surface truncate max-w-[110px]"
                title={f.title}
              >
                {f.icon && <span>{f.icon}</span>}
                <span className="truncate">{f.title}</span>
              </span>
            ))}
            {extraFeedsCount > 0 && (
              <span
                className="text-[10px] font-mono px-1 py-0.5 rounded bg-tile-subtle border border-tile-border text-text-muted hover:text-text-main"
                title={boundFeeds.slice(3).map((f) => f.title).join(', ')}
              >
                +{extraFeedsCount}
              </span>
            )}
          </>
        )}
      </div>

      {/* Criteria (Tags & Folders) */}
      <div className="flex items-center gap-1 flex-wrap min-w-0">
        {stream.tags && stream.tags.length > 0 && (
          <span
            className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 truncate"
            title={stream.tags.map((t) => `#${t}`).join(', ')}
          >
            <Hash className="w-2.5 h-2.5 shrink-0" />
            <span>{stream.tags.length} tags</span>
          </span>
        )}
        {stream.folderPaths && stream.folderPaths.length > 0 && (
          <span
            className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 truncate"
            title={stream.folderPaths.join(', ')}
          >
            <Folder className="w-2.5 h-2.5 shrink-0" />
            <span>{stream.folderPaths.length} paths</span>
          </span>
        )}
        {(!stream.tags || stream.tags.length === 0) &&
          (!stream.folderPaths || stream.folderPaths.length === 0) && (
            <span className="text-[10px] text-text-muted">—</span>
          )}
      </div>

      {/* Notes Count */}
      <div>
        <span className="text-[11px] font-mono text-on-surface-variant font-medium">
          {stream._count?.notes !== undefined ? `${stream._count.notes} шт.` : '—'}
        </span>
      </div>

      {/* Actions */}
      <div
        className="flex items-center justify-end gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onOpenAnalytics(stream)}
          title="Открыть аналитику"
          className="p-1 text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer"
        >
          <BarChart2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onEdit(stream)}
          title="Редактировать стрим"
          className="p-1 text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <a
          href={feedAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Открыть в Feed App"
          className="p-1 text-text-muted hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        {!stream.isBuiltin && (
          <button
            type="button"
            onClick={() => onDelete(stream.id)}
            title="Удалить стрим"
            className="p-1 text-text-muted hover:text-error hover:bg-error/10 rounded transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
