import React from 'react';
import { ObsidianContainer } from '@lenta/shared';
import { useTimeSliceNotes } from '../api/queries';
import { useObsidianContainers } from '../context/ObsidianContainersContext';
import { filterNotesForContainer, computeNoteChanges, ChangeLogItem } from '../utils/obsidianContainers.utils';
import { Clock, CheckCheck, Sparkles, FileText, ArrowRight, Activity } from 'lucide-react';
import dayjs from 'dayjs';

interface ContainerActivityHistoryTabProps {
  container: ObsidianContainer;
  onOpenNote?: (noteId: string) => void;
}

export const ContainerActivityHistoryTab: React.FC<ContainerActivityHistoryTabProps> = ({
  container,
  onOpenNote,
}) => {
  const { getContainerLastVisited, markContainerVisited } = useObsidianContainers();
  const lastVisitedAt = getContainerLastVisited(container.id);

  const { data: notesData, isLoading } = useTimeSliceNotes({
    start: '1970-01-01',
    end: '2099-12-31',
    containers: [container.id],
    containersList: [container],
  });

  const notes = notesData?.items || [];
  const containerNotes = filterNotesForContainer(notes, container);
  const allChanges = computeNoteChanges(containerNotes, lastVisitedAt);

  const unreadChanges = allChanges.filter((item) => item.isUnread);
  const previousChanges = allChanges.filter((item) => !item.isUnread);

  const lastVisitFormatted = lastVisitedAt
    ? dayjs(lastVisitedAt).format('DD.MM.YYYY в HH:mm')
    : 'Первый визит';

  const renderChangeItem = (item: ChangeLogItem) => (
    <div
      key={item.id}
      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
        item.isUnread
          ? 'bg-[#121d16] border-[#22c55e]/40 hover:border-[#22c55e]/60'
          : 'bg-[#121414] border-[#242828] hover:border-[#333]'
      }`}
    >
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
              item.type === 'add'
                ? 'bg-[#22c55e]/20 text-[#86efac] border-[#22c55e]/40'
                : 'bg-[#e5e971]/20 text-[#fef08a] border-[#e5e971]/40'
            }`}
          >
            {item.badgeText || (item.type === 'add' ? 'ДОБАВЛЕНО' : 'ОБНОВЛЕНО')}
          </span>

          {item.curatorLabel && (
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#1a1d1d] text-[#c9c7b2] border border-[#2d3030]">
              {item.curatorLabel}
            </span>
          )}

          <h4 className="font-sans font-semibold text-sm text-[#e2e2e2] truncate max-w-md">
            {item.rawTitle || item.text}
          </h4>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-[#93927e]">
          <span>Источник: {item.curator || 'system'}</span>
          <span>•</span>
          <span>{item.date}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {item.isUnread && (
          <span className="px-2 py-0.5 rounded bg-[#22c55e]/15 text-[#86efac] text-[10px] font-mono font-bold border border-[#22c55e]/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Свежее</span>
          </span>
        )}

        {onOpenNote && item.noteId && (
          <button
            type="button"
            onClick={() => onOpenNote(item.noteId!)}
            className="p-1.5 rounded-lg bg-[#181a1a] hover:bg-[#222525] text-[#93927e] hover:text-[#e2e2e2] border border-[#2d3030] transition-colors"
            title="Открыть заметку"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Banner: Watermark Header & Controls */}
      <div className="p-5 rounded-2xl bg-[#181a1a] border border-[#242828] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#242828] pb-4">
          <div>
            <h3 className="font-sans font-bold text-base text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#22c55e]" />
              <span>Журнал активности и обновлений (Activity Stream)</span>
            </h3>
            <p className="text-xs text-[#93927e] mt-1">
              Потоковый срез изменений из всех источников (Gemini Sparks, Command Bus, Obsidian, MCP).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-mono text-[#93927e]">Предыдущий визит</div>
              <div className="text-xs font-mono text-[#c9c7b2] font-semibold">{lastVisitFormatted}</div>
            </div>

            {unreadChanges.length > 0 && (
              <button
                type="button"
                onClick={() => markContainerVisited(container.id)}
                className="px-3.5 py-1.5 rounded-lg bg-[#22c55e] hover:bg-[#2bd968] text-[#121414] font-sans text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Отметить всё как просмотренное</span>
              </button>
            )}
          </div>
        </div>

        {/* Delta Summary Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-[#121414] border border-[#242828] flex items-center justify-between">
            <span className="text-xs font-mono text-[#93927e]">Всего заметок</span>
            <span className="text-sm font-mono font-bold text-white">{containerNotes.length}</span>
          </div>

          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            unreadChanges.length > 0
              ? 'bg-[#121d16] border-[#22c55e]/40'
              : 'bg-[#121414] border-[#242828]'
          }`}>
            <span className="text-xs font-mono text-[#93927e]">Новых с прошлого визита</span>
            <span className={`text-sm font-mono font-bold ${
              unreadChanges.length > 0 ? 'text-[#22c55e]' : 'text-[#93927e]'
            }`}>
              {unreadChanges.length > 0 ? `+${unreadChanges.length}` : '0'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#121414] border border-[#242828] flex items-center justify-between">
            <span className="text-xs font-mono text-[#93927e]">Статус потока</span>
            <span className="text-xs font-mono font-bold text-[#c9cd58]">Live Stream Active</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-sm font-mono text-[#93927e]">
          Загрузка журнала изменений...
        </div>
      ) : allChanges.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#181a1a] border border-[#242828] text-center space-y-2">
          <FileText className="w-8 h-8 text-[#93927e] mx-auto opacity-50" />
          <p className="text-sm text-[#e2e2e2] font-semibold">В контейнере пока нет заметок</p>
          <p className="text-xs text-[#93927e]">
            Новые заметки появятся здесь автоматически при поступлении из Gemini Sparks, шины или Obsidian.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Unread Delta since last visit */}
          {unreadChanges.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#22c55e]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Новые изменения с момента последнего визита ({unreadChanges.length})</span>
              </div>
              <div className="space-y-2">
                {unreadChanges.map(renderChangeItem)}
              </div>
            </div>
          )}

          {/* Section 2: Previous Activity */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#93927e]">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {unreadChanges.length > 0
                  ? `Ранее просмотренные заметки (${previousChanges.length})`
                  : `Хронология изменений (${allChanges.length})`}
              </span>
            </div>
            <div className="space-y-2">
              {previousChanges.map(renderChangeItem)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
