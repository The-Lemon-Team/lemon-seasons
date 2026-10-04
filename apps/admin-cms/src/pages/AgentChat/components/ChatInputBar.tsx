import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Button, Input } from 'antd';
import { Send as SendIcon } from 'lucide-react';
import {
  ChatSnippet,
  DEFAULT_CHAT_SNIPPETS,
  AgentId,
} from '@lemon/agents';
import { CURATOR_PERSONAS_LIST } from '@lenta/shared';
import { ChatThread } from '../../../types';
import { QuickCommandsBar } from './QuickCommandsBar';

const { TextArea } = Input;

interface ChatInputBarProps {
  activeThread?: ChatThread | null;
  isPending: boolean;
  disabled: boolean;
  onSendMessage: (text: string, targetAgent: AgentId | 'all') => void;
  onExecuteCommand: (command: string, customPrompt?: string) => void;
  onToggleCommandsSidebar: () => void;
  isCommandsSidebarOpen: boolean;
  insertedCommand?: string | null;
  onClearInsertedCommand?: () => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = React.memo(
  ({
    activeThread,
    isPending,
    disabled,
    onSendMessage,
    onExecuteCommand,
    onToggleCommandsSidebar,
    isCommandsSidebarOpen,
    insertedCommand,
    onClearInsertedCommand,
  }) => {
    const [inputText, setInputText] = useState('');
    const [selectedTargetAgent, setSelectedTargetAgent] = useState<AgentId | 'all'>('all');
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [slashFilter, setSlashFilter] = useState('');
    const [highlightedSnippetIndex, setHighlightedSnippetIndex] = useState(0);

    const textareaRef = useRef<any>(null);
    const prevThreadIdRef = useRef<string | null>(null);

    // Reset target agent to 'all' when switching threads
    useEffect(() => {
      if (activeThread?.id && activeThread.id !== prevThreadIdRef.current) {
        prevThreadIdRef.current = activeThread.id;
        setSelectedTargetAgent('all');
      }
    }, [activeThread?.id]);

    // Synchronize externally inserted commands
    useEffect(() => {
      if (insertedCommand) {
        setInputText(insertedCommand + ' ');
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
        onClearInsertedCommand?.();
      }
    }, [insertedCommand, onClearInsertedCommand]);

    // Filter snippets based on slash query
    const filteredSnippets = useMemo(() => {
      const q = slashFilter.trim().toLowerCase();
      if (!q) return DEFAULT_CHAT_SNIPPETS;
      return DEFAULT_CHAT_SNIPPETS.filter(
        (s) =>
          s.command.toLowerCase().includes(q) ||
          s.label.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      );
    }, [slashFilter]);

    // Input change handler
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setInputText(val);

      if (val.startsWith('/')) {
        setShowSlashMenu(true);
        setSlashFilter(val.slice(1));
        setHighlightedSnippetIndex(0);
      } else {
        setShowSlashMenu(false);
      }
    };

    // Selecting a slash snippet
    const handleSelectSnippet = useCallback(
      (snippet: ChatSnippet) => {
        setInputText(snippet.command + ' ');
        if (snippet.targetAgent !== 'all') {
          setSelectedTargetAgent(snippet.targetAgent);
        }
        setShowSlashMenu(false);
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      },
      []
    );

    // Send message handler
    const handleSend = () => {
      const trimmed = inputText.trim();
      if (!trimmed || isPending || disabled) return;

      onSendMessage(trimmed, selectedTargetAgent);
      setInputText('');
      setShowSlashMenu(false);

      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    };

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showSlashMenu && filteredSnippets.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedSnippetIndex((prev) => (prev + 1) % filteredSnippets.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedSnippetIndex(
            (prev) => (prev - 1 + filteredSnippets.length) % filteredSnippets.length
          );
          return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const selected = filteredSnippets[highlightedSnippetIndex];
          if (selected) {
            handleSelectSnippet(selected);
          }
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowSlashMenu(false);
          return;
        }
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    // Individual (DIRECT) chats don't have recipient targeting; all other chats have two bars (commands + recipient selector)
    const isIndividualChat = activeThread?.type === 'DIRECT';
    const showRecipientBar = !isIndividualChat;

    return (
      <footer className="border-t border-white/10 bg-[#161b22] relative z-10 flex flex-col flex-shrink-0">
        {/* Always visible Quick Commands Strip (/politics, /it, etc.) */}
        <QuickCommandsBar
          onExecuteCommand={onExecuteCommand}
          onInsertCommand={(cmd) => {
            setInputText(cmd + ' ');
            if (textareaRef.current) {
              textareaRef.current.focus();
            }
          }}
          onToggleCommandsSidebar={onToggleCommandsSidebar}
          isCommandsSidebarOpen={isCommandsSidebarOpen}
        />

        {/* Quick Slash Snippets Suggestions Popover */}
        {showSlashMenu && filteredSnippets.length > 0 && (
          <div className="absolute bottom-full mb-2 left-3 right-3 max-h-56 overflow-y-auto bg-[#1c2128] border border-white/15 rounded-xl shadow-2xl p-1.5 space-y-1 z-30 custom-scrollbar animate-in fade-in">
            <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
              <span>Быстрые команды и пресеты агентов:</span>
              <span className="text-[9px] text-gray-500">↑↓ навигация, Enter выбор</span>
            </div>
            {filteredSnippets.map((snippet, idx) => {
              const isHighlighted = idx === highlightedSnippetIndex;
              return (
                <div
                  key={snippet.id}
                  onClick={() => handleSelectSnippet(snippet)}
                  onMouseEnter={() => setHighlightedSnippetIndex(idx)}
                  className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${
                    isHighlighted ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-primary font-bold">{snippet.command}</span>
                    <span className="text-white font-medium">{snippet.label}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 truncate max-w-xs">
                    {snippet.description}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="p-2.5 space-y-2">
          {/* Two stripes for all chats except individual chats: Recipient Selector Bar */}
          {showRecipientBar && (
            <div className="h-7 min-h-[28px] max-h-[28px] flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-xs select-none flex-shrink-0">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mr-1 flex-shrink-0">
                Адресовать:
              </span>
              <button
                type="button"
                onClick={() => setSelectedTargetAgent('all')}
                className={`h-6 px-2.5 rounded-full text-[10px] font-medium transition-all flex items-center justify-center flex-shrink-0 border ${
                  selectedTargetAgent === 'all'
                    ? 'bg-primary text-black font-bold shadow border-primary'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                }`}
              >
                Все кураторы
              </button>
              {activeThread?.participantAgents?.map((agentId: string) => {
                const persona = CURATOR_PERSONAS_LIST.find((p) => p.id === agentId);
                const isSelected = selectedTargetAgent === agentId;
                return (
                  <button
                    key={agentId}
                    type="button"
                    onClick={() => setSelectedTargetAgent(agentId as any)}
                    className={`h-6 px-2.5 rounded-full text-[10px] font-medium transition-all flex items-center gap-1 flex-shrink-0 border ${
                      isSelected
                        ? 'bg-sky-500 text-white font-bold shadow border-sky-400'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                    }`}
                  >
                    <span>{persona?.emoji || '👤'}</span>
                    <span>{persona?.shortName || agentId}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Textarea & Send Button */}
          <div className="flex items-end gap-2 bg-[#0d1117] border border-white/10 rounded-xl p-2 focus-within:border-primary/60 transition-colors">
            <TextArea
              ref={textareaRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                !isIndividualChat
                  ? "Напишите вопрос совету или используйте команду (например, '/politics', '/it' или '/breaking')..."
                  : `Задайте вопрос куратору ${activeThread?.title || ''}...`
              }
              autoSize={{ minRows: 1, maxRows: 5 }}
              className="bg-transparent border-0 text-white resize-none shadow-none text-xs focus:shadow-none p-1 placeholder-gray-500"
            />

            <Button
              type="primary"
              onClick={handleSend}
              loading={isPending}
              disabled={!inputText.trim() || disabled}
              className="bg-primary hover:bg-primary/90 text-on-primary font-bold h-7 px-3 rounded-lg flex items-center justify-center flex-shrink-0"
            >
              <SendIcon className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </footer>
    );
  }
);

ChatInputBar.displayName = 'ChatInputBar';
