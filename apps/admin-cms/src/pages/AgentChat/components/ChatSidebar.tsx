import React, { useState, useMemo } from 'react';
import { Button, Input, Tooltip, Popconfirm } from 'antd';
import {
  Folder as FolderIcon,
  FolderPlus,
  MessageSquarePlus,
  Pin,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { ChatFolder, ChatThread } from '../../../types';
import { ThreadListItem, getCuratorEmoji } from './ThreadListItem';

interface ChatSidebarProps {
  folders: ChatFolder[];
  threads: ChatThread[];
  selectedThreadId: string | null;
  threadsLoading: boolean;
  searchThreadText: string;
  onSearchChange: (val: string) => void;
  onSelectThread: (threadId: string) => void;
  onPinThread: (threadId: string, isPinned: boolean) => void;
  onDeleteThread: (threadId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onOpenCreateThreadModal: () => void;
  onOpenCreateFolderModal: () => void;
  onSeedDefaults: () => void;
  isSeeding: boolean;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = React.memo(
  ({
    folders,
    threads,
    selectedThreadId,
    threadsLoading,
    searchThreadText,
    onSearchChange,
    onSelectThread,
    onPinThread,
    onDeleteThread,
    onDeleteFolder,
    onOpenCreateThreadModal,
    onOpenCreateFolderModal,
    onSeedDefaults,
    isSeeding,
  }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

    const toggleFolder = (folderId: string) => {
      setExpandedFolders((prev) => ({
        ...prev,
        [folderId]: prev[folderId] === undefined ? false : !prev[folderId],
      }));
    };

    // Group threads into pinned, folder-assigned, and unassigned
    const { pinnedThreads, folderGroupedThreads, unassignedThreads } = useMemo(() => {
      const pinned: ChatThread[] = [];
      const grouped: Record<string, ChatThread[]> = {};
      const unassigned: ChatThread[] = [];

      folders.forEach((f) => {
        grouped[f.id] = [];
      });

      threads.forEach((t) => {
        if (t.isPinned) {
          pinned.push(t);
        }
        if (t.folderId && grouped[t.folderId]) {
          grouped[t.folderId].push(t);
        } else {
          unassigned.push(t);
        }
      });

      return {
        pinnedThreads: pinned,
        folderGroupedThreads: grouped,
        unassignedThreads: unassigned,
      };
    }, [threads, folders]);

    return (
      <aside
        className={`${
          sidebarCollapsed ? 'w-14' : 'w-64'
        } bg-[#161b22] border-r border-white/10 flex flex-col flex-shrink-0 transition-all duration-200 select-none z-20`}
      >
        {/* Compact Sidebar Header */}
        <div className="px-2.5 py-2 border-b border-white/5 flex items-center justify-between gap-1.5">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="material-symbols-outlined text-primary text-base">forum</span>
              <span className="font-bold text-[11px] uppercase tracking-wider text-white truncate">
                Чаты & Коллегии
              </span>
            </div>
          )}

          <div className="flex items-center gap-0.5">
            {!sidebarCollapsed && (
              <>
                <Tooltip title="Создать новый чат">
                  <Button
                    type="text"
                    size="small"
                    onClick={onOpenCreateThreadModal}
                    className="text-gray-400 hover:text-primary hover:bg-white/5 p-1 h-6 w-6 flex items-center justify-center rounded-md"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                  </Button>
                </Tooltip>

                <Tooltip title="Создать тематическую папку">
                  <Button
                    type="text"
                    size="small"
                    onClick={onOpenCreateFolderModal}
                    className="text-gray-400 hover:text-emerald-400 hover:bg-white/5 p-1 h-6 w-6 flex items-center justify-center rounded-md"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </Button>
                </Tooltip>
              </>
            )}

            <Button
              type="text"
              size="small"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-gray-400 hover:text-white p-1 h-6 w-6 flex items-center justify-center rounded-md"
              title={sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
            >
              <span className="material-symbols-outlined text-sm">
                {sidebarCollapsed ? 'chevron_right' : 'chevron_left'}
              </span>
            </Button>
          </div>
        </div>

        {/* Compact Search Input */}
        {!sidebarCollapsed && (
          <div className="p-1.5 px-2 border-b border-white/5">
            <Input
              prefix={<Search className="w-3 h-3 text-gray-500 mr-1" />}
              placeholder="Поиск чатов..."
              value={searchThreadText}
              onChange={(e) => onSearchChange(e.target.value)}
              allowClear
              className="bg-white/5 border-white/10 text-[11px] text-white placeholder-gray-500 h-7 rounded-md"
            />
          </div>
        )}

        {/* Compact Threads & Folders List */}
        {!sidebarCollapsed ? (
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 text-xs custom-scrollbar">
            {threads.length === 0 && !threadsLoading && (
              <div className="text-center py-4 px-2 bg-white/5 rounded-lg border border-white/5">
                <p className="text-gray-400 text-[11px] mb-2">Чаты не найдены</p>
                <Button
                  type="primary"
                  size="small"
                  onClick={onSeedDefaults}
                  loading={isSeeding}
                  className="bg-primary text-on-primary text-[11px] font-bold h-6 px-2"
                >
                  Загрузить папки
                </Button>
              </div>
            )}

            {/* Pinned Threads */}
            {pinnedThreads.length > 0 && (
              <div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-amber-400/90">
                  <Pin className="w-2.5 h-2.5 text-amber-400" />
                  <span>Закрепленные</span>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {pinnedThreads.map((thread) => (
                    <ThreadListItem
                      key={thread.id}
                      thread={thread}
                      isActive={thread.id === selectedThreadId}
                      onSelect={onSelectThread}
                      onPin={onPinThread}
                      onDelete={onDeleteThread}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Folders Accordion */}
            {folders.map((folder) => {
              const folderThreads = folderGroupedThreads[folder.id] || [];
              const isExpanded = expandedFolders[folder.id] !== false; // expanded by default

              return (
                <div key={folder.id} className="space-y-0.5">
                  <div
                    onClick={() => toggleFolder(folder.id)}
                    className="flex items-center justify-between px-1.5 py-1 rounded-md hover:bg-white/5 cursor-pointer text-gray-300 font-semibold group transition-all"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      )}
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: folder.color || '#3b82f6' }}
                      />
                      <span className="truncate text-[11px] text-white font-medium">{folder.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[9px] bg-white/10 px-1 py-0.2 rounded text-gray-400 font-mono">
                        {folderThreads.length}
                      </span>
                      <Popconfirm
                        title="Удалить папку?"
                        description="Чаты останутся в общем списке."
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          onDeleteFolder(folder.id);
                        }}
                        okText="Удалить"
                        cancelText="Отмена"
                      >
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 text-gray-500 transition-opacity"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </Popconfirm>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="pl-2 space-y-0.5">
                      {folderThreads.length === 0 ? (
                        <div className="text-[10px] text-gray-500 italic px-2 py-0.5">
                          Пустая папка
                        </div>
                      ) : (
                        folderThreads.map((thread) => (
                          <ThreadListItem
                            key={thread.id}
                            thread={thread}
                            isActive={thread.id === selectedThreadId}
                            onSelect={onSelectThread}
                            onPin={onPinThread}
                            onDelete={onDeleteThread}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Unassigned Threads */}
            {unassignedThreads.length > 0 && (
              <div className="space-y-0.5 pt-1.5 border-t border-white/5">
                <div className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  <FolderIcon className="w-2.5 h-2.5" />
                  <span>Общие диалоги</span>
                  <span className="ml-auto text-[9px] bg-white/10 px-1 py-0.2 rounded font-mono">
                    {unassignedThreads.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {unassignedThreads.map((thread) => (
                    <ThreadListItem
                      key={thread.id}
                      thread={thread}
                      isActive={thread.id === selectedThreadId}
                      onSelect={onSelectThread}
                      onPin={onPinThread}
                      onDelete={onDeleteThread}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Collapsed Mini Sidebar */
          <div className="flex-1 py-2 flex flex-col items-center gap-1.5 overflow-y-auto">
            {threads.slice(0, 15).map((thread) => (
              <Tooltip key={thread.id} title={thread.title} placement="right">
                <button
                  onClick={() => onSelectThread(thread.id)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all text-xs ${
                    thread.id === selectedThreadId
                      ? 'bg-primary text-black font-bold shadow-md'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  {thread.type === 'GROUP' ? '👥' : getCuratorEmoji(thread.targetAgent)}
                </button>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Compact Sidebar Footer */}
        {!sidebarCollapsed && (
          <div className="px-2 py-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-400">
            <span>Project Lenta Desk</span>
            <Button
              type="text"
              size="small"
              onClick={onSeedDefaults}
              loading={isSeeding}
              className="text-gray-400 hover:text-primary text-[10px] flex items-center gap-1 h-5 px-1"
              title="Перезагрузить папки и стартовые комнаты"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Сброс</span>
            </Button>
          </div>
        )}
      </aside>
    );
  }
);

ChatSidebar.displayName = 'ChatSidebar';
