import React from 'react';
import { DatePicker, Dropdown, Button, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { Folder as FolderIcon, Pin, Trash2, MoreVertical, Terminal } from 'lucide-react';
import { CURATOR_PERSONAS_LIST } from '@lenta/shared';
import { ChatThread } from '../../../types';
import { getCuratorEmoji } from './ThreadListItem';

interface ChatHeaderProps {
  activeThread?: ChatThread | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onPinThread: (isPinned: boolean) => void;
  onDeleteThread: () => void;
  onToggleCommandsSidebar?: () => void;
  isCommandsSidebarOpen?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = React.memo(
  ({
    activeThread,
    selectedDate,
    onDateChange,
    onPinThread,
    onDeleteThread,
    onToggleCommandsSidebar,
    isCommandsSidebarOpen,
  }) => {
    return (
      <header className="h-14 px-3.5 border-b border-white/10 bg-[#161b22]/90 backdrop-blur flex items-center justify-between flex-shrink-0 z-10">
        {activeThread ? (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-lg flex-shrink-0 select-none">
              {activeThread.type === 'GROUP' ? '🏛️' : getCuratorEmoji(activeThread.targetAgent)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xs text-white truncate">{activeThread.title}</h2>
                <Tag
                  color={activeThread.type === 'GROUP' ? 'cyan' : 'purple'}
                  className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0 m-0"
                >
                  {activeThread.type === 'GROUP' ? '👥 Группа' : '👤 Диалог'}
                </Tag>

                {activeThread.folder && (
                  <span className="text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.2 rounded border border-white/5 flex items-center gap-1">
                    <FolderIcon className="w-2.5 h-2.5 text-sky-400" />
                    {activeThread.folder.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
                <span>Участники:</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {activeThread.participantAgents?.map((agentId: string) => {
                    const persona = CURATOR_PERSONAS_LIST.find((p) => p.id === agentId);
                    return (
                      <span
                        key={agentId}
                        className="bg-white/5 px-1 py-0.2 rounded text-[9px] text-gray-300 font-mono"
                        title={persona?.role || agentId}
                      >
                        {persona ? `${persona.emoji} ${persona.shortName}` : agentId}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-400">Выберите диалог слева для начала общения</div>
        )}

        {/* Header Controls: Date & Commands Toggle & Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <DatePicker
            value={dayjs(selectedDate)}
            onChange={(d) => d && onDateChange(d.format('YYYY-MM-DD'))}
            allowClear={false}
            className="bg-white/5 border-white/10 text-white text-xs h-7 rounded-md"
          />

          {onToggleCommandsSidebar && (
            <Tooltip title={isCommandsSidebarOpen ? 'Скрыть сайдбар команд' : 'Открыть карту команд'}>
              <Button
                type={isCommandsSidebarOpen ? 'primary' : 'default'}
                size="small"
                onClick={onToggleCommandsSidebar}
                className={`h-7 px-2.5 flex items-center gap-1.5 text-xs rounded-md font-medium transition-all ${
                  isCommandsSidebarOpen
                    ? 'bg-primary text-black font-bold'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Карта команд</span>
              </Button>
            </Tooltip>
          )}

          {activeThread && (
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'pin',
                    label: activeThread.isPinned ? 'Открепить' : 'Закрепить вверху',
                    icon: <Pin className="w-3.5 h-3.5" />,
                    onClick: () => onPinThread(!activeThread.isPinned),
                  },
                  {
                    type: 'divider',
                  },
                  {
                    key: 'delete',
                    label: 'Удалить диалог',
                    icon: <Trash2 className="w-3.5 h-3.5 text-red-400" />,
                    danger: true,
                    onClick: onDeleteThread,
                  },
                ],
              }}
            >
              <Button
                type="text"
                size="small"
                className="text-gray-400 hover:text-white h-7 w-7 flex items-center justify-center rounded-md hover:bg-white/5"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </Dropdown>
          )}
        </div>
      </header>
    );
  }
);

ChatHeader.displayName = 'ChatHeader';
