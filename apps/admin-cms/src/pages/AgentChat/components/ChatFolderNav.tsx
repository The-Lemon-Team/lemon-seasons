import React, { useMemo } from 'react';
import { Tooltip } from 'antd';
import {
  MessageSquare,
  FolderPlus,
  Cpu,
  Landmark,
  Sparkles,
  TrendingUp,
  Folder as DefaultFolderIcon,
} from 'lucide-react';
import { ChatFolder, ChatThread } from '../../../types';

interface ChatFolderNavProps {
  folders: ChatFolder[];
  threads: ChatThread[];
  selectedFolderId: string; // 'all' or specific folder UUID
  onSelectFolder: (folderId: string) => void;
  onOpenCreateFolderModal: () => void;
}

function renderMonochromeFolderIcon(iconName?: string | null, isSelected?: boolean) {
  const iconClass = `w-5 h-5 transition-colors ${
    isSelected ? 'text-white' : 'text-[#8b949e] group-hover:text-[#c9d1d9]'
  }`;

  switch (iconName?.toLowerCase()) {
    case 'cpu':
      return <Cpu className={iconClass} strokeWidth={1.75} />;
    case 'landmark':
      return <Landmark className={iconClass} strokeWidth={1.75} />;
    case 'sparkles':
      return <Sparkles className={iconClass} strokeWidth={1.75} />;
    case 'trendingup':
    case 'trending-up':
      return <TrendingUp className={iconClass} strokeWidth={1.75} />;
    default:
      return <DefaultFolderIcon className={iconClass} strokeWidth={1.75} />;
  }
}

export const ChatFolderNav: React.FC<ChatFolderNavProps> = React.memo(
  ({
    folders,
    threads,
    selectedFolderId,
    onSelectFolder,
    onOpenCreateFolderModal,
  }) => {
    // Count threads per folder
    const threadCounts = useMemo(() => {
      const counts: Record<string, number> = { all: threads.length };
      folders.forEach((f) => {
        counts[f.id] = 0;
      });
      threads.forEach((t) => {
        if (t.folderId && counts[t.folderId] !== undefined) {
          counts[t.folderId]++;
        }
      });
      return counts;
    }, [folders, threads]);

    return (
      <nav
        aria-label="Панель папок"
        className="w-[68px] bg-[#0d1117] border-r border-white/5 flex flex-col items-center py-3 flex-shrink-0 select-none z-20 gap-1"
      >
        {/* 1. All Chats Tab (Все чаты) */}
        <Tooltip title="Все чаты (сквозной список)" placement="right">
          <button
            onClick={() => onSelectFolder('all')}
            className={`group relative w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all ${
              selectedFolderId === 'all'
                ? 'bg-white/[0.08] text-white'
                : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-white/[0.04]'
            }`}
          >
            {/* Telegram Left Indicator Bar */}
            {selectedFolderId === 'all' && (
              <span className="absolute left-[-8px] top-2.5 bottom-2.5 w-[3px] bg-primary rounded-r-full" />
            )}

            <div className="relative">
              <MessageSquare
                className={`w-5 h-5 transition-colors ${
                  selectedFolderId === 'all'
                    ? 'text-white'
                    : 'text-[#8b949e] group-hover:text-[#c9d1d9]'
                }`}
                strokeWidth={1.75}
              />
              {threadCounts.all > 0 && (
                <span
                  className={`absolute -top-1.5 -right-2.5 font-mono text-[9px] px-1 rounded-full min-w-[14px] text-center ${
                    selectedFolderId === 'all'
                      ? 'bg-primary text-black font-bold'
                      : 'bg-[#21262d] text-[#8b949e]'
                  }`}
                >
                  {threadCounts.all}
                </span>
              )}
            </div>
            <span
              className={`text-[9px] mt-0.5 tracking-tight truncate max-w-[44px] transition-colors ${
                selectedFolderId === 'all'
                  ? 'text-white font-medium'
                  : 'text-[#8b949e] group-hover:text-[#c9d1d9]'
              }`}
            >
              Все
            </span>
          </button>
        </Tooltip>

        <div className="w-8 h-[1px] bg-white/5 my-1" />

        {/* 2. Folders List (Монохромные контуры папок) */}
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center gap-1 custom-scrollbar px-1">
          {folders.map((folder) => {
            const isSelected = selectedFolderId === folder.id;
            const count = threadCounts[folder.id] || 0;

            return (
              <Tooltip
                key={folder.id}
                title={
                  <div>
                    <div className="font-semibold text-xs text-white">{folder.name}</div>
                    {folder.description && (
                      <div className="text-[11px] text-gray-400 mt-0.5">{folder.description}</div>
                    )}
                    <div className="text-[10px] text-gray-500 mt-1 font-mono">
                      Чатов: {count}
                    </div>
                  </div>
                }
                placement="right"
              >
                <button
                  onClick={() => onSelectFolder(folder.id)}
                  className={`group relative w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-white/[0.08] text-white'
                      : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Telegram Left Indicator Bar */}
                  {isSelected && (
                    <span className="absolute left-[-8px] top-2.5 bottom-2.5 w-[3px] bg-primary rounded-r-full" />
                  )}

                  <div className="relative">
                    {renderMonochromeFolderIcon(folder.icon, isSelected)}
                    {count > 0 && (
                      <span
                        className={`absolute -top-1.5 -right-2.5 font-mono text-[9px] px-1 rounded-full min-w-[14px] text-center ${
                          isSelected
                            ? 'bg-primary text-black font-bold'
                            : 'bg-[#21262d] text-[#8b949e]'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[9px] mt-0.5 tracking-tight truncate max-w-[44px] transition-colors ${
                      isSelected
                        ? 'text-white font-medium'
                        : 'text-[#8b949e] group-hover:text-[#c9d1d9]'
                    }`}
                  >
                    {folder.name.split(' ')[0]}
                  </span>
                </button>
              </Tooltip>
            );
          })}
        </div>

        <div className="w-8 h-[1px] bg-white/5 my-1" />

        {/* 3. Create Folder Button [+] */}
        <Tooltip title="Создать папку контура" placement="right">
          <button
            onClick={onOpenCreateFolderModal}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#8b949e] hover:text-white hover:bg-white/[0.05] transition-all"
          >
            <FolderPlus className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </Tooltip>
      </nav>
    );
  },
);

ChatFolderNav.displayName = 'ChatFolderNav';
