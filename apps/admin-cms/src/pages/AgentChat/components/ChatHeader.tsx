import React from 'react';
import { Button, Tooltip, Popconfirm } from 'antd';
import {
  Folder as FolderIcon,
  Pin,
  Trash2,
  Mic,
  Palette,
} from 'lucide-react';
import { ChatThread } from '../../../types';
import { renderTypeBadge, getThreadAvatar } from './ChatListColumn';

interface ChatHeaderProps {
  activeThread?: ChatThread | null;
  onPinThread: (isPinned: boolean) => void;
  onDeleteThread: () => void;
  onGeneratePhoto: () => void;
  onGeneratePodcast: () => void;
  isGeneratingPhoto?: boolean;
  isGeneratingPodcast?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = React.memo(
  ({
    activeThread,
    onPinThread,
    onDeleteThread,
    onGeneratePhoto,
    onGeneratePodcast,
    isGeneratingPhoto,
    isGeneratingPodcast,
  }) => {
    if (!activeThread) {
      return (
        <header className="h-14 px-4 border-b border-white/5 bg-[#161b22] flex items-center justify-between flex-shrink-0 z-10">
          <div className="text-xs text-gray-500 font-normal">Выберите диалог или топик слева для начала работы</div>
        </header>
      );
    }

    const avatarInfo = getThreadAvatar(activeThread);

    return (
      <header className="h-14 px-4 border-b border-white/5 bg-[#161b22] flex items-center justify-between flex-shrink-0 z-10 gap-3">
        {/* Left: Chat info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 select-none border border-white/5 ${avatarInfo.bg}`}
          >
            {avatarInfo.icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-xs text-white truncate max-w-[280px]">
                {activeThread.title}
              </h2>
              {renderTypeBadge(activeThread.type)}

              {activeThread.folder && (
                <span className="text-[10px] text-gray-400 bg-white/[0.04] px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                  <FolderIcon className="w-2.5 h-2.5 text-gray-400" />
                  {activeThread.folder.name}
                </span>
              )}
            </div>

            {/* Subtitle / Role description */}
            <div className="text-[10px] text-gray-400 truncate mt-0.5 font-normal">
              {activeThread.curator ? (
                <span>
                  Ведущий куратор: <span className="text-gray-300 font-medium">{activeThread.curator.name}</span> ({activeThread.curator.roleTitle})
                </span>
              ) : activeThread.assistant ? (
                <span>
                  Специализация агента: <span className="text-emerald-400 font-medium">{activeThread.assistant.name}</span> ({activeThread.assistant.skillType})
                </span>
              ) : (
                <span>Рабочий топик контура • Доступны помощники генерации</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Action Skills & Controls (минималистичные кнопки без раздражающих рамок) */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* 1. Skill: Generate Photo (Gemini) */}
          <Tooltip title="Сгенерировать иллюстрацию через Gemini Imagen">
            <Button
              type="text"
              size="small"
              onClick={onGeneratePhoto}
              loading={isGeneratingPhoto}
              className="text-gray-300 hover:text-white hover:bg-white/[0.06] text-xs h-7 px-2.5 flex items-center gap-1.5 rounded-md font-medium"
            >
              <Palette className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Создать фото</span>
            </Button>
          </Tooltip>

          {/* 2. Skill: Generate Podcast (NotebookLM) */}
          <Tooltip title="Собрать тезисы топика в двухголосный аудио-диалог NotebookLM">
            <Button
              type="text"
              size="small"
              onClick={onGeneratePodcast}
              loading={isGeneratingPodcast}
              className="text-gray-300 hover:text-white hover:bg-white/[0.06] text-xs h-7 px-2.5 flex items-center gap-1.5 rounded-md font-medium"
            >
              <Mic className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden md:inline">NotebookLM</span>
            </Button>
          </Tooltip>

          <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

          {/* 3. Pin Button */}
          <Tooltip title={activeThread.isPinned ? 'Открепить чат' : 'Закрепить чат'}>
            <Button
              type="text"
              size="small"
              onClick={() => onPinThread(!activeThread.isPinned)}
              className={`h-7 w-7 flex items-center justify-center rounded-md p-0 ${
                activeThread.isPinned ? 'text-amber-400 bg-amber-400/10' : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
            </Button>
          </Tooltip>

          {/* 4. Delete Button */}
          <Popconfirm
            title="Удалить диалог?"
            description="Все сообщения будут удалены безвозвратно."
            onConfirm={onDeleteThread}
            okText="Удалить"
            cancelText="Отмена"
          >
            <Button
              type="text"
              size="small"
              className="h-7 w-7 flex items-center justify-center rounded-md p-0 text-gray-400 hover:text-red-400 hover:bg-red-400/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </Popconfirm>
        </div>
      </header>
    );
  },
);

ChatHeader.displayName = 'ChatHeader';
