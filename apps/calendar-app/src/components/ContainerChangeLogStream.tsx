import React from 'react';
import { ObsidianContainer } from '@lenta/shared';
import { useObsidianContainerCommitsQuery, useTimeSliceNotes } from '../api/queries';
import { getContainerChangeLogItems } from '../utils/obsidianContainers.utils';
import { FileText, ChevronRight } from 'lucide-react';

export interface ContainerChangeLogStreamProps {
  container: ObsidianContainer;
  onOpenHistory: () => void;
}

export const ContainerChangeLogStream: React.FC<ContainerChangeLogStreamProps> = ({
  container,
  onOpenHistory,
}) => {
  const { data: serverCommits = [] } = useObsidianContainerCommitsQuery(container.id);
  const { data: notesData } = useTimeSliceNotes({
    start: '1970-01-01',
    end: '2099-12-31',
    containers: [container.id],
    containersList: [container],
  });

  const notes = notesData?.items || [];
  const displayItems = getContainerChangeLogItems(container, serverCommits, notes, 6);

  return (
    <div className="p-3 rounded-lg bg-[#121414] border border-[#242828] space-y-2">
      <div className="flex items-center justify-between font-mono text-[11px] font-bold text-[#c9c7b2]">
        <span className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[#3b82f6]" />
          <span>Лента изменений (Last Changes)</span>
        </span>

        <button
          type="button"
          onClick={onOpenHistory}
          className="text-[10px] text-[#a855f7] hover:text-[#d8b4fe] hover:underline font-semibold flex items-center gap-1"
        >
          <span>Полная история (Time Machine)</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className="p-2 rounded bg-[#0f1111] border border-[#242828] flex items-center justify-between text-[11px] font-mono hover:border-[#333] transition-colors"
          >
            <span className={`flex items-center gap-2 ${item.colorClass}`}>
              <span className="font-bold">{item.symbol}</span>
              <span className="text-[#e2e2e2] truncate max-w-[280px] sm:max-w-[400px]">
                {item.text}
              </span>
            </span>
            <span className="text-[#93927e] text-[10px] shrink-0 ml-2">{item.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
