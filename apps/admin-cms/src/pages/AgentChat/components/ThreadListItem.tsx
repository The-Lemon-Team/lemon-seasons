import React from 'react';
import { Popconfirm } from 'antd';
import { Pin, Trash2 } from 'lucide-react';
import { CURATOR_PERSONAS_LIST } from '@lenta/shared';
import { ChatThread } from '../../../types';

export function getCuratorEmoji(agentId?: string | null): string {
  if (!agentId) return '💬';
  const found = CURATOR_PERSONAS_LIST.find((p) => p.id === agentId);
  return found?.emoji || '👤';
}

interface ThreadListItemProps {
  thread: ChatThread;
  isActive: boolean;
  onSelect: (id: string) => void;
  onPin: (id: string, isPinned: boolean) => void;
  onDelete: (id: string) => void;
}

export const ThreadListItem: React.FC<ThreadListItemProps> = React.memo(
  ({ thread, isActive, onSelect, onPin, onDelete }) => {
    const lastMsg = thread.messages && thread.messages[0];

    return (
      <div
        onClick={() => onSelect(thread.id)}
        className={`group relative px-2 py-1.5 rounded-lg transition-all cursor-pointer border flex items-center gap-2 ${
          isActive
            ? 'bg-primary/20 border-primary/60 text-white shadow-sm'
            : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/5 text-gray-300'
        }`}
      >
        {/* Compact Avatar */}
        <div className="w-6 h-6 rounded-md bg-black/40 border border-white/10 flex items-center justify-center text-xs flex-shrink-0 select-none">
          {thread.type === 'GROUP' ? '👥' : getCuratorEmoji(thread.targetAgent)}
        </div>

        {/* Compact Title & Subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 leading-tight">
            <span className="font-semibold text-[11px] truncate text-white">{thread.title}</span>
            {thread.isPinned && (
              <Pin className="w-2.5 h-2.5 text-amber-400 flex-shrink-0 fill-amber-400/20" />
            )}
          </div>

          <div className="text-[10px] text-gray-400 truncate mt-0.5 font-normal leading-tight">
            {lastMsg ? `${lastMsg.senderName}: ${lastMsg.text}` : 'Ожидает вопроса...'}
          </div>
        </div>

        {/* Hover Actions */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin(thread.id, !thread.isPinned);
            }}
            className="hover:text-amber-400 text-gray-400 p-0.5 transition-colors"
            title={thread.isPinned ? 'Открепить' : 'Закрепить'}
          >
            <Pin className="w-2.5 h-2.5" />
          </button>

          <Popconfirm
            title="Удалить диалог?"
            description="Все сообщения треда будут удалены."
            onConfirm={(e) => {
              e?.stopPropagation();
              onDelete(thread.id);
            }}
            okText="Удалить"
            cancelText="Отмена"
          >
            <button
              onClick={(e) => e.stopPropagation()}
              className="hover:text-red-400 text-gray-400 p-0.5 transition-colors"
              title="Удалить тред"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          </Popconfirm>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.isActive === next.isActive &&
    prev.thread.id === next.thread.id &&
    prev.thread.isPinned === next.thread.isPinned &&
    prev.thread.title === next.thread.title &&
    prev.thread.lastMessageAt === next.thread.lastMessageAt &&
    prev.thread.messages?.[0]?.text === next.thread.messages?.[0]?.text
);

ThreadListItem.displayName = 'ThreadListItem';
