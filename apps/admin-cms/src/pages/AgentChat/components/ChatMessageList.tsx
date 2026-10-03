import React from 'react';
import { Spin } from 'antd';
import { ArrowDown } from 'lucide-react';
import { ResonanceNodeCandidate } from '@lemon/agents';
import { ChatMessageRecord, TelegramNewsPreview } from '../../../types';
import { ChatMessageItem } from './ChatMessageItem';
import { useChatScroll } from '../hooks/useChatScroll';

interface ChatMessageListProps {
  messages: (ChatMessageRecord & { isOptimistic?: boolean })[];
  isLoading: boolean;
  isPending: boolean;
  selectedThreadId: string | null;
  onOpenCardDrawer: (msg: ChatMessageRecord) => void;
  onCopyText: (text: string) => void;
  onTriggerSynthesis: (node: ResonanceNodeCandidate) => void;
  onTriggerSingleSynthesis: (msg: ChatMessageRecord) => void;
  onNavigateToCurator?: (curatorId: string, contextPrompt?: string) => void;
  onSaveNewsPostToCalendar?: (post: TelegramNewsPreview) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = React.memo(
  ({
    messages,
    isLoading,
    isPending,
    selectedThreadId,
    onOpenCardDrawer,
    onCopyText,
    onTriggerSynthesis,
    onTriggerSingleSynthesis,
    onNavigateToCurator,
    onSaveNewsPostToCalendar,
  }) => {
    const { containerRef, showScrollBottom, scrollToBottom, handleScroll } = useChatScroll({
      threadId: selectedThreadId,
      dependencyList: [messages.length, isPending],
    });

    return (
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Scroll Container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4 text-sm custom-scrollbar"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <Spin size="default" />
              <span className="text-xs text-gray-400">Загрузка истории диалога...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-40">chat</span>
              <p className="text-sm font-medium">В этом диалоге еще нет сообщений</p>
              <p className="text-xs max-w-sm mt-1 text-gray-400">
                Задайте вопрос агентам ниже или воспользуйтесь быстрой командой через{' '}
                <code className="text-primary font-mono">/</code>
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessageItem
                key={msg.id}
                msg={msg}
                onOpenCardDrawer={onOpenCardDrawer}
                onCopyText={onCopyText}
                onTriggerSynthesis={onTriggerSynthesis}
                onTriggerSingleSynthesis={onTriggerSingleSynthesis}
                onNavigateToCurator={onNavigateToCurator}
                onSaveNewsPostToCalendar={onSaveNewsPostToCalendar}
              />
            ))
          )}

          {/* AI Generating Indicator */}
          {isPending && (
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl max-w-sm border border-white/10 animate-pulse">
              <Spin size="small" />
              <div className="text-xs text-gray-300">
                Кураторы анализируют контекст и формируют ответ...
              </div>
            </div>
          )}
        </div>

        {/* Floating Scroll-to-Bottom Button */}
        {showScrollBottom && (
          <button
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-4 right-6 bg-[#1c2128]/95 border border-white/20 hover:border-primary text-gray-300 hover:text-white px-3 py-1.5 rounded-full shadow-2xl backdrop-blur text-xs flex items-center gap-1.5 transition-all z-20 hover:scale-105 active:scale-95"
            title="Прокрутить к новым сообщениям"
          >
            <ArrowDown className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium">Вниз</span>
          </button>
        )}
      </div>
    );
  }
);

ChatMessageList.displayName = 'ChatMessageList';
