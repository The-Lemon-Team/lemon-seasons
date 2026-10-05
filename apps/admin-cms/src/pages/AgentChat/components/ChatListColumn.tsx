import React, { useMemo, useState } from 'react';
import { Input, Button, Dropdown, MenuProps, Popconfirm } from 'antd';
import {
  Search,
  Plus,
  Pin,
  Trash2,
  MessageSquare,
  UserCheck,
} from 'lucide-react';
import dayjs from 'dayjs';
import { ChatFolder, ChatThread } from '../../../types';

interface ChatListColumnProps {
  threads: ChatThread[];
  activeFolder?: ChatFolder | null;
  selectedFolderId: string;
  selectedThreadId: string | null;
  threadsLoading: boolean;
  searchThreadText: string;
  onSearchChange: (val: string) => void;
  onSelectThread: (threadId: string) => void;
  onPinThread: (threadId: string, isPinned: boolean) => void;
  onDeleteThread: (threadId: string) => void;
  onOpenCreateTopicModal: () => void;
  onOpenCreateCuratorModal: () => void;
  onDeleteFolder?: (folderId: string) => void;
}

export function renderTypeBadge(type?: string) {
  switch (type) {
    case 'CURATOR':
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wide uppercase bg-amber-400/10 text-amber-300/90">
          Куратор
        </span>
      );
    case 'ASSISTANT':
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wide uppercase bg-emerald-400/10 text-emerald-300/90">
          Агент
        </span>
      );
    case 'GROUP':
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wide uppercase bg-purple-400/10 text-purple-300/90">
          Группа
        </span>
      );
    case 'TOPIC':
    default:
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wide uppercase bg-sky-400/10 text-sky-300/90">
          Топик
        </span>
      );
  }
}

export function getThreadAvatar(thread: ChatThread): { icon: string; bg: string } {
  if (thread.type === 'CURATOR' && thread.curator) {
    return { icon: thread.curator.emoji || '👤', bg: 'bg-[#21262d] text-amber-300' };
  }
  if (thread.type === 'ASSISTANT' && thread.assistant) {
    return { icon: thread.assistant.avatar || '🛠️', bg: 'bg-[#21262d] text-emerald-300' };
  }
  if (thread.type === 'GROUP') {
    return { icon: '👥', bg: 'bg-[#21262d] text-purple-300' };
  }
  return { icon: '💬', bg: 'bg-[#21262d] text-sky-300' };
}

export const ChatListColumn: React.FC<ChatListColumnProps> = React.memo(
  ({
    threads,
    activeFolder,
    selectedFolderId,
    selectedThreadId,
    threadsLoading,
    searchThreadText,
    onSearchChange,
    onSelectThread,
    onPinThread,
    onDeleteThread,
    onOpenCreateTopicModal,
    onOpenCreateCuratorModal,
    onDeleteFolder,
  }) => {
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'TOPIC' | 'CURATOR' | 'ASSISTANT'>('ALL');

    // Filter threads by folder and search and optional typeFilter
    const filteredThreads = useMemo(() => {
      let result = threads;

      // Folder filter
      if (selectedFolderId !== 'all') {
        result = result.filter((t) => t.folderId === selectedFolderId);
      }

      // Type sub-filter
      if (typeFilter !== 'ALL') {
        result = result.filter((t) => t.type === typeFilter);
      }

      // Search filter
      if (searchThreadText.trim()) {
        const q = searchThreadText.toLowerCase().trim();
        result = result.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.messages?.[0]?.text?.toLowerCase().includes(q) ||
            t.curator?.name?.toLowerCase().includes(q) ||
            t.assistant?.name?.toLowerCase().includes(q),
        );
      }

      return result;
    }, [threads, selectedFolderId, typeFilter, searchThreadText]);

    const newChatMenu: MenuProps['items'] = [
      {
        key: 'new-topic',
        label: (
          <div className="flex items-center gap-2 py-0.5">
            <MessageSquare className="w-4 h-4 text-sky-400" />
            <div>
              <div className="font-semibold text-xs text-white">Новый Топик</div>
              <div className="text-[10px] text-gray-400">Рабочий чат, выжимка или генерация в контуре</div>
            </div>
          </div>
        ),
        onClick: onOpenCreateTopicModal,
      },
      {
        key: 'new-curator',
        label: (
          <div className="flex items-center gap-2 py-0.5">
            <UserCheck className="w-4 h-4 text-amber-400" />
            <div>
              <div className="font-semibold text-xs text-white">Создать Куратора</div>
              <div className="text-[10px] text-gray-400">Настроить ИИ-агента с уникальной персоналией</div>
            </div>
          </div>
        ),
        onClick: onOpenCreateCuratorModal,
      },
    ];

    return (
      <aside
        aria-label="Список чатов"
        className="w-72 bg-[#161b22] border-r border-white/5 flex flex-col flex-shrink-0 select-none z-10 h-full"
      >
        {/* 1. Header with Active Folder Title & Action */}
        <div className="px-3.5 py-3 border-b border-white/5 flex items-center justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 truncate">
              {activeFolder ? (
                <>
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: activeFolder.color || '#3b82f6' }}
                  />
                  <span className="font-semibold text-xs text-white truncate">
                    {activeFolder.name}
                  </span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="font-semibold text-xs text-white truncate">Все чаты</span>
                </>
              )}
            </div>
            <div className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">
              {filteredThreads.length} диалогов
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Dropdown menu={{ items: newChatMenu }} placement="bottomRight" trigger={['click']}>
              <Button
                type="text"
                size="small"
                className="text-gray-300 hover:text-white hover:bg-white/[0.06] text-xs h-7 px-2 flex items-center gap-1 rounded-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">Создать</span>
              </Button>
            </Dropdown>

            {activeFolder && onDeleteFolder && (
              <Popconfirm
                title="Удалить папку?"
                description="Чаты останутся в общем потоке."
                onConfirm={() => onDeleteFolder(activeFolder.id)}
                okText="Удалить"
                cancelText="Отмена"
              >
                <button
                  className="text-gray-500 hover:text-red-400 p-1 rounded-md transition-colors"
                  title="Удалить папку"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </Popconfirm>
            )}
          </div>
        </div>

        {/* 2. Search Input */}
        <div className="p-2 border-b border-white/5">
          <Input
            prefix={<Search className="w-3.5 h-3.5 text-gray-500 mr-1" />}
            placeholder="Поиск диалогов..."
            value={searchThreadText}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            className="bg-white/[0.03] border-white/5 hover:border-white/10 focus:border-primary/40 text-xs text-white placeholder-gray-500 h-7 rounded-md"
          />
        </div>

        {/* 3. Type Pills Sub-filter (Все / Топики / Кураторы / Агенты) */}
        <div className="px-2.5 py-1.5 border-b border-white/5 flex items-center gap-1 overflow-x-auto text-[11px] custom-scrollbar">
          {(
            [
              { id: 'ALL', label: 'Все' },
              { id: 'TOPIC', label: 'Топики' },
              { id: 'CURATOR', label: 'Кураторы' },
              { id: 'ASSISTANT', label: 'Агенты' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-2 py-0.5 rounded-md font-medium transition-all whitespace-nowrap text-[10px] ${
                typeFilter === tab.id
                  ? 'bg-white/[0.1] text-white font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 4. Unified Telegram-style Chat List (без раздражающих обводок) */}
        <div className="flex-1 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
          {threadsLoading ? (
            <div className="text-center py-6 text-gray-500 text-xs">Загрузка чатов...</div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-8 px-3 bg-white/[0.02] rounded-xl m-1">
              <MessageSquare className="w-6 h-6 text-gray-500 mx-auto mb-2 opacity-50" />
              <div className="text-gray-300 text-xs font-semibold">Нет диалогов</div>
              <div className="text-gray-500 text-[10px] mt-0.5">
                {selectedFolderId === 'all'
                  ? 'Создайте первый топик или диалог с куратором'
                  : 'В этой папке пока нет топиков'}
              </div>
              <Button
                type="text"
                size="small"
                onClick={onOpenCreateTopicModal}
                className="mt-3 text-primary hover:bg-primary/10 font-medium text-[11px] h-6"
              >
                + Создать топик
              </Button>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isActive = thread.id === selectedThreadId;
              const avatarInfo = getThreadAvatar(thread);
              const lastMsg = thread.messages?.[0];
              const timeDisplay = thread.lastMessageAt
                ? dayjs(thread.lastMessageAt).format('HH:mm')
                : '';

              return (
                <div
                  key={thread.id}
                  onClick={() => onSelectThread(thread.id)}
                  className={`group relative px-2.5 py-2.5 rounded-lg transition-all cursor-pointer flex items-start gap-2.5 ${
                    isActive
                      ? 'bg-[#21262d] text-white shadow-sm'
                      : 'bg-transparent hover:bg-white/[0.04] text-gray-300'
                  }`}
                >
                  {/* Telegram-style Left Selection Strip (вместо толстой обводки) */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-primary rounded-r-full" />
                  )}

                  {/* Left: Avatar */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 select-none border border-white/5 ${avatarInfo.bg}`}
                  >
                    {avatarInfo.icon}
                  </div>

                  {/* Center: Title, Badge, and Message Preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 leading-tight">
                      <span
                        className={`text-xs truncate ${
                          isActive ? 'font-semibold text-white' : 'font-medium text-gray-200'
                        }`}
                      >
                        {thread.title}
                      </span>
                      {timeDisplay && (
                        <span className="text-[10px] text-gray-500 flex-shrink-0 font-mono">
                          {timeDisplay}
                        </span>
                      )}
                    </div>

                    {/* Badge Row */}
                    <div className="flex items-center gap-1.5 mt-1">
                      {renderTypeBadge(thread.type)}

                      {/* If in All Chats view: show subtle folder tag */}
                      {selectedFolderId === 'all' && thread.folder && (
                        <span className="text-[9px] text-gray-400 font-mono truncate max-w-[90px]">
                          {thread.folder.name}
                        </span>
                      )}

                      {thread.isPinned && (
                        <Pin className="w-2.5 h-2.5 text-amber-400 ml-auto flex-shrink-0 fill-amber-400/20" />
                      )}
                    </div>

                    {/* Last message preview */}
                    <div className="text-[11px] text-gray-400 truncate mt-1 leading-tight font-normal">
                      {lastMsg ? (
                        <>
                          <span className={isActive ? 'text-gray-300' : 'text-gray-400'}>
                            {lastMsg.senderName}:
                          </span>{' '}
                          {lastMsg.text}
                        </>
                      ) : (
                        <span className="italic text-gray-500">Ожидает вопроса...</span>
                      )}
                    </div>
                  </div>

                  {/* Actions on hover */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0 self-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPinThread(thread.id, !thread.isPinned);
                      }}
                      className="hover:text-amber-400 text-gray-400 p-1 transition-colors"
                      title={thread.isPinned ? 'Открепить' : 'Закрепить'}
                    >
                      <Pin className="w-3 h-3" />
                    </button>

                    <Popconfirm
                      title="Удалить диалог?"
                      description="Все сообщения будут удалены."
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        onDeleteThread(thread.id);
                      }}
                      okText="Удалить"
                      cancelText="Отмена"
                    >
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-red-400 text-gray-400 p-1 transition-colors"
                        title="Удалить диалог"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Popconfirm>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    );
  },
);

ChatListColumn.displayName = 'ChatListColumn';
