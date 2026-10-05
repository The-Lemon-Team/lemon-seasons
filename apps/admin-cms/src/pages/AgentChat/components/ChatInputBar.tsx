import React, { useState, useRef } from 'react';
import { Button, Input } from 'antd';
import { Send as SendIcon, Palette, Mic } from 'lucide-react';
import { ChatThread } from '../../../types';

const { TextArea } = Input;

interface ChatInputBarProps {
  activeThread?: ChatThread | null;
  isPending: boolean;
  disabled: boolean;
  onSendMessage: (text: string) => void;
  onGeneratePhoto?: () => void;
  onGeneratePodcast?: () => void;
  isGeneratingPhoto?: boolean;
  isGeneratingPodcast?: boolean;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = React.memo(
  ({
    activeThread,
    isPending,
    disabled,
    onSendMessage,
    onGeneratePhoto,
    onGeneratePodcast,
    isGeneratingPhoto,
    isGeneratingPodcast,
  }) => {
    const [inputText, setInputText] = useState('');
    const textareaRef = useRef<any>(null);

    const handleSend = () => {
      const trimmed = inputText.trim();
      if (!trimmed || isPending || disabled) return;
      onSendMessage(trimmed);
      setInputText('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    return (
      <footer className="border-t border-white/5 bg-[#161b22] relative z-10 flex flex-col flex-shrink-0">
        {/* Action Chips Strip (Photo, Podcast, Curator shortcut) */}
        <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 overflow-x-auto custom-scrollbar select-none">
          {onGeneratePhoto && (
            <button
              type="button"
              onClick={onGeneratePhoto}
              disabled={disabled || isGeneratingPhoto}
              className="h-6 px-2.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 flex-shrink-0 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white disabled:opacity-40"
            >
              <Palette className="w-3 h-3 text-emerald-400" />
              <span>Создать фото (Gemini)</span>
            </button>
          )}

          {onGeneratePodcast && (
            <button
              type="button"
              onClick={onGeneratePodcast}
              disabled={disabled || isGeneratingPodcast}
              className="h-6 px-2.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 flex-shrink-0 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white disabled:opacity-40"
            >
              <Mic className="w-3 h-3 text-purple-400" />
              <span>NotebookLM Подкаст</span>
            </button>
          )}

          {activeThread?.curator && (
            <button
              type="button"
              onClick={() => {
                setInputText(`@${activeThread.curator!.name} `);
                textareaRef.current?.focus();
              }}
              className="h-6 px-2.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 flex-shrink-0 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white"
            >
              <span>{activeThread.curator.emoji}</span>
              <span>@{activeThread.curator.name}</span>
            </button>
          )}

          {activeThread?.folder?.imageStylePrompt && (
            <span
              className="text-[10px] text-gray-500 ml-auto flex-shrink-0 truncate max-w-xs font-mono"
              title={activeThread.folder.imageStylePrompt}
            >
              Стиль: {activeThread.folder.imageStylePrompt}
            </span>
          )}
        </div>

        {/* Textarea & Send Button */}
        <div className="p-2.5 pt-1">
          <div className="flex items-end gap-2 bg-[#0d1117] border border-white/5 rounded-xl p-2 focus-within:border-white/20 transition-colors">
            <TextArea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeThread?.curator
                  ? `Задайте вопрос куратору ${activeThread.curator.name}...`
                  : activeThread
                  ? `Напишите сообщение в «${activeThread.title}»... (Enter — отправить)`
                  : 'Выберите диалог для отправки сообщения...'
              }
              autoSize={{ minRows: 1, maxRows: 6 }}
              disabled={disabled}
              className="bg-transparent border-0 text-white placeholder-gray-500 text-xs focus:shadow-none focus:outline-none resize-none p-0 custom-scrollbar"
            />

            <Button
              type="text"
              onClick={handleSend}
              loading={isPending}
              disabled={disabled || !inputText.trim()}
              className="text-primary hover:bg-primary/10 h-7 w-7 rounded-lg p-0 flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <SendIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </footer>
    );
  },
);

ChatInputBar.displayName = 'ChatInputBar';
