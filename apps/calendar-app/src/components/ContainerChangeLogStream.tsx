import React from 'react';
import { ObsidianContainer } from '@lenta/shared';
import { useObsidianContainerCommitsQuery, useTimeSliceNotes } from '../api/queries';
import { getContainerChangeLogItems } from '../utils/obsidianContainers.utils';
import { useObsidianContainers } from '../context/ObsidianContainersContext';
import { FileText, ChevronRight, CheckCheck, Sparkles } from 'lucide-react';

export interface ContainerChangeLogStreamProps {
  container: ObsidianContainer;
  onOpenHistory: () => void;
}

export const ContainerChangeLogStream: React.FC<ContainerChangeLogStreamProps> = ({
  container,
  onOpenHistory,
}) => {
  const { getContainerLastVisited, markContainerVisited } = useObsidianContainers();
  const lastVisitedAt = getContainerLastVisited(container.id);

  const { data: serverCommits = [] } = useObsidianContainerCommitsQuery(container.id);
  const { data: notesData } = useTimeSliceNotes({
    start: '1970-01-01',
    end: '2099-12-31',
    containers: [container.id],
    containersList: [container],
  });

  const notes = notesData?.items || [];
  const displayItems = getContainerChangeLogItems(container, serverCommits, notes, 6, lastVisitedAt);
  const unreadItemsCount = displayItems.filter((i) => i.isUnread).length;

  return (
    <div className="p-3 rounded-lg bg-[#121414] border border-[#242828] space-y-2">
      <div className="flex items-center justify-between font-mono text-[11px] font-bold text-[#c9c7b2]">
        <span className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[#3b82f6]" />
          <span>Лента изменений (Last Changes)</span>
          {unreadItemsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#22c55e]/20 text-[#86efac] border border-[#22c55e]/40 font-semibold flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>+{unreadItemsCount} новых</span>
            </span>
          )}
        </span>

        <div className="flex items-center gap-2">
          {unreadItemsCount > 0 && (
            <button
              type="button"
              onClick={() => markContainerVisited(container.id)}
              title="Отметить изменения как просмотренные"
              className="text-[10px] text-[#93927e] hover:text-[#e5e971] flex items-center gap-1 transition-colors"
            >
              <CheckCheck className="w-3 h-3 text-[#22c55e]" />
              <span className="hidden sm:inline">Прочитано</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenHistory}
            className="text-[10px] text-[#a855f7] hover:text-[#d8b4fe] hover:underline font-semibold flex items-center gap-1"
          >
            <span>История</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className={`p-2 rounded bg-[#0f1111] border transition-colors flex items-center justify-between text-[11px] font-mono ${
              item.isUnread
                ? 'border-[#22c55e]/40 bg-[#121d16]'
                : 'border-[#242828] hover:border-[#333]'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <span className={`font-bold shrink-0 ${item.colorClass}`}>{item.symbol}</span>
              <span className="text-[#e2e2e2] truncate max-w-[220px] sm:max-w-[340px]">
                {item.text}
              </span>
              {item.curatorLabel && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1e2020] text-[#93927e] border border-[#2d3030] shrink-0 hidden md:inline">
                  {item.curatorLabel}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {item.isUnread && (
                <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-[#22c55e]/20 text-[#86efac] border border-[#22c55e]/40">
                  NEW
                </span>
              )}
              <span className="text-[#93927e] text-[10px] ml-1">{item.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
