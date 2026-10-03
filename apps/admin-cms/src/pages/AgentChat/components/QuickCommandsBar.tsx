import React, { useMemo } from 'react';
import { Tooltip, Tag } from 'antd';
import { Sparkles, LayoutGrid, Terminal, ArrowRight } from 'lucide-react';
import {
  CHAT_COMMANDS_REGISTRY,
  GROUPED_COMMANDS_REGISTRY,
  ChatCommandMeta,
} from './commandRegistry';
import { PeriodCommandDropdown } from './PeriodCommandDropdown';

interface QuickCommandsBarProps {
  onExecuteCommand: (command: string, customPrompt?: string) => void;
  onInsertCommand: (command: string) => void;
  onToggleCommandsSidebar: () => void;
  isCommandsSidebarOpen: boolean;
}

export const QuickCommandsBar: React.FC<QuickCommandsBarProps> = React.memo(
  ({
    onExecuteCommand,
    onInsertCommand,
    onToggleCommandsSidebar,
    isCommandsSidebarOpen,
  }) => {
    // Secondary auxiliary quick commands to show alongside grouped controllers
    const otherQuickCommands = useMemo(() => {
      return CHAT_COMMANDS_REGISTRY.filter(
        (c) =>
          c.isPopular &&
          !c.command.startsWith('/politics') &&
          !c.command.startsWith('/it') &&
          !c.command.startsWith('/breaking') &&
          c.command !== '/alex'
      );
    }, []);

    return (
      <div className="h-[38px] min-h-[38px] max-h-[38px] flex-shrink-0 flex items-center justify-between gap-2 px-3 bg-[#161b22]/95 border-t border-white/5 text-xs select-none">
        {/* Left: Quick Command Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar h-full min-w-0 py-0.5">
          <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-gray-400 flex-shrink-0 mr-1">
            <Terminal className="w-3 h-3 text-primary" />
            <span className="hidden sm:inline">Команды:</span>
          </div>

          {/* 1. Grouped Hover Controllers: /politics, /it, /breaking */}
          <PeriodCommandDropdown
            group={GROUPED_COMMANDS_REGISTRY.politics}
            onExecuteCommand={onExecuteCommand}
            onInsertCommand={onInsertCommand}
            placement="topLeft"
          />

          <PeriodCommandDropdown
            group={GROUPED_COMMANDS_REGISTRY.it}
            onExecuteCommand={onExecuteCommand}
            onInsertCommand={onInsertCommand}
            placement="topLeft"
          />

          <PeriodCommandDropdown
            group={GROUPED_COMMANDS_REGISTRY.breaking}
            onExecuteCommand={onExecuteCommand}
            onInsertCommand={onInsertCommand}
            placement="topLeft"
          />

          {/* Thin separator */}
          <div className="h-3 w-[1px] bg-white/10 mx-0.5 flex-shrink-0" />

          {/* 2. Other Popular Auxiliary Commands */}
          {otherQuickCommands.map((item) => {
            const isRedirect = item.type === 'REDIRECT';

            return (
              <Tooltip
                key={item.id}
                title={
                  <div className="text-xs space-y-1 p-1 max-w-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-primary font-mono">{item.command}</span>
                      <span className="text-[10px] opacity-80">
                        {isRedirect ? '🔗 Переход в тред' : '⚡ Вспомогательная в любом чате'}
                      </span>
                    </div>
                    <div className="font-semibold text-white">{item.label}</div>
                    <div className="text-gray-300 text-[11px]">{item.description}</div>
                    <div className="text-[10px] text-sky-300 pt-1 border-t border-white/10 flex items-center justify-between">
                      {isRedirect ? (
                        <span>Нажмите для перехода в тред ➔</span>
                      ) : (
                        <span>Клик — вставить в чат</span>
                      )}
                    </div>
                  </div>
                }
              >
                <button
                  type="button"
                  onClick={() => {
                    if (isRedirect) {
                      onExecuteCommand(item.command, item.defaultPrompt);
                    } else {
                      onInsertCommand(item.command);
                    }
                  }}
                  className={`h-6 flex items-center gap-1 px-2 rounded-md text-[11px] font-mono transition-all flex-shrink-0 border ${
                    isRedirect
                      ? 'bg-sky-950/40 border-sky-500/30 text-sky-200 hover:bg-sky-900/50 hover:border-sky-400'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20'
                  }`}
                >
                  <span>{item.emoji}</span>
                  <span className="font-semibold">{item.command}</span>
                  {isRedirect ? (
                    <ArrowRight className="w-2.5 h-2.5 text-sky-400 ml-0.5 opacity-70" />
                  ) : (
                    <Sparkles className="w-2.5 h-2.5 text-amber-400/80 ml-0.5" />
                  )}
                </button>
              </Tooltip>
            );
          })}
        </div>

        {/* Right: Sidebar Toggle Button */}
        <div className="flex items-center flex-shrink-0 pl-1 border-l border-white/5">
          <button
            type="button"
            onClick={onToggleCommandsSidebar}
            className={`h-6 flex items-center gap-1 px-2 rounded-md text-[11px] font-medium transition-all ${
              isCommandsSidebarOpen
                ? 'bg-primary text-black font-bold shadow'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10'
            }`}
            title={isCommandsSidebarOpen ? 'Скрыть карту команд' : 'Показать полную карту команд'}
          >
            <LayoutGrid className="w-3 h-3" />
            <span className="hidden md:inline">Все команды</span>
            <Tag
              bordered={false}
              className={`m-0 text-[9px] px-1 py-0 leading-tight font-mono rounded ${
                isCommandsSidebarOpen ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-300'
              }`}
            >
              {CHAT_COMMANDS_REGISTRY.length}
            </Tag>
          </button>
        </div>
      </div>
    );
  }
);

QuickCommandsBar.displayName = 'QuickCommandsBar';
