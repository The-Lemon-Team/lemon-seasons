import React, { useState, useMemo, useEffect } from 'react';
import { Input, Button, Tag, Tooltip, message, Segmented } from 'antd';
import {
  Search,
  X,
  Copy,
  Check,
  ArrowRight,
  Play,
  Edit3,
  HelpCircle,
  Terminal,
  ChevronDown,
  ListCollapse,
  LayoutGrid,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  CHAT_COMMANDS_REGISTRY,
  GROUPED_COMMANDS_REGISTRY,
  ChatCommandMeta,
  GroupedCommandMeta,
  CommandCategory,
  PeriodOption,
} from './commandRegistry';

interface CommandsSidebarProps {
  onClose: () => void;
  onExecuteCommand: (command: string, customPrompt?: string) => void;
  onInsertCommand: (command: string) => void;
  activeThreadTitle?: string;
}

export const CommandsSidebar: React.FC<CommandsSidebarProps> = React.memo(
  ({ onClose, onExecuteCommand, onInsertCommand, activeThreadTitle }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<CommandCategory>('ALL');
    const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

    // View mode: 'accordion' (compact with info on click) vs 'cards' (compact cards)
    const [viewMode, setViewMode] = useState<'accordion' | 'cards'>(() => {
      return (localStorage.getItem('lemon_commands_view_mode') as any) || 'accordion';
    });

    // Which accordion item is currently open (null = all collapsed)
    const [expandedCommandId, setExpandedCommandId] = useState<string | null>(null);

    // Track active period for grouped commands (politics, it, breaking)
    const [selectedPeriods, setSelectedPeriods] = useState<Record<string, 'today' | 'week' | 'month'>>({
      politics: 'today',
      it: 'today',
      breaking: 'today',
    });

    // Persist view mode
    const handleSetViewMode = (mode: 'accordion' | 'cards') => {
      setViewMode(mode);
      localStorage.setItem('lemon_commands_view_mode', mode);
    };

    // Close on Escape key press
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Check if a category matches a grouped command
    const matchesCategory = (category: CommandCategory, groupCategory: CommandCategory, groupKey: string) => {
      if (category === 'ALL') return true;
      if (category === 'REDIRECT') return true;
      if (category === 'TECH' && groupKey === 'it') return true;
      return false;
    };

    // Filter items
    const isSearching = searchQuery.trim().length > 0;

    const filteredGrouped = useMemo(() => {
      const groups = Object.values(GROUPED_COMMANDS_REGISTRY);
      if (isSearching) {
        const q = searchQuery.trim().toLowerCase();
        return groups.filter(
          (g) =>
            g.baseCommand.toLowerCase().includes(q) ||
            g.label.toLowerCase().includes(q) ||
            g.description.toLowerCase().includes(q) ||
            g.periods.some((p) => p.command.toLowerCase().includes(q) || p.label.toLowerCase().includes(q))
        );
      }
      return groups.filter((g) => matchesCategory(activeCategory, g.category, g.id.replace('group-', '')));
    }, [activeCategory, isSearching, searchQuery]);

    const filteredIndividualCommands = useMemo(() => {
      let list = CHAT_COMMANDS_REGISTRY;

      if (!isSearching) {
        // In default view, exclude sub-variants of grouped commands to keep list neat & compact
        list = list.filter(
          (c) =>
            !c.command.startsWith('/politics ') &&
            !c.command.startsWith('/it ') &&
            !c.command.startsWith('/breaking ') &&
            c.command !== '/politics' &&
            c.command !== '/it' &&
            c.command !== '/breaking' &&
            c.command !== '/alex'
        );

        if (activeCategory === 'REDIRECT') {
          list = list.filter((c) => c.type === 'REDIRECT');
        } else if (activeCategory === 'AUXILIARY') {
          list = list.filter((c) => c.type === 'AUXILIARY');
        } else if (activeCategory === 'TECH') {
          list = list.filter((c) => c.category === 'TECH');
        } else if (activeCategory === 'SURVEY') {
          list = list.filter((c) => c.category === 'SURVEY' || c.command === '/survey');
        } else if (activeCategory === 'CONTENT') {
          list = list.filter((c) => c.category === 'CONTENT' || c.command === '/sidework');
        }
      } else {
        const q = searchQuery.trim().toLowerCase();
        list = list.filter(
          (c) =>
            c.command.toLowerCase().includes(q) ||
            c.label.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            c.tags?.some((t) => t.toLowerCase().includes(q))
        );
      }

      return list;
    }, [activeCategory, isSearching, searchQuery]);

    const handleCopy = (cmd: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      navigator.clipboard.writeText(cmd);
      setCopiedCmd(cmd);
      message.success(`Команда ${cmd} скопирована в буфер`);
      setTimeout(() => setCopiedCmd(null), 1800);
    };

    const handleRedirect = (command: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      onExecuteCommand(command);
      onClose();
    };

    const handleInsert = (command: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      onInsertCommand(command);
      onClose();
    };

    const handleRun = (command: string, prompt?: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      onExecuteCommand(command, prompt);
      onClose();
    };

    const toggleAccordion = (id: string) => {
      setExpandedCommandId((prev) => (prev === id ? null : id));
    };

    const handlePeriodChange = (groupKey: string, period: 'today' | 'week' | 'month', e?: React.MouseEvent) => {
      e?.stopPropagation();
      setSelectedPeriods((prev) => ({
        ...prev,
        [groupKey]: period,
      }));
    };

    return (
      <div className="absolute inset-0 z-50 flex justify-end overflow-hidden">
        {/* Backdrop Overlay */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200 cursor-pointer"
          onClick={onClose}
          title="Нажмите для закрытия"
        />

        {/* Floating Slide-over Panel */}
        <aside className="relative w-full max-w-sm sm:w-[390px] bg-[#161b22] border-l border-white/10 flex flex-col h-full select-none z-10 shadow-2xl animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-2.5 border-b border-white/10 flex items-center justify-between gap-2 bg-[#1c2128]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0">
                <Terminal className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                    Карта команд
                  </h3>
                  <Tag bordered={false} className="bg-white/10 text-gray-300 text-[10px] px-1 py-0 m-0">
                    {filteredGrouped.length + filteredIndividualCommands.length}
                  </Tag>
                </div>
              </div>
            </div>

            {/* View Mode Switcher + Close */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => handleSetViewMode('accordion')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-all ${
                    viewMode === 'accordion'
                      ? 'bg-primary text-black font-bold shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Аккордеон: компактный список с раскрытием информации по клику"
                >
                  <ListCollapse className="w-3 h-3" />
                  <span className="hidden xs:inline">Аккордеон</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewMode('cards')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-all ${
                    viewMode === 'cards'
                      ? 'bg-primary text-black font-bold shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Карточки: компактный блочный вид"
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span className="hidden xs:inline">Карточки</span>
                </button>
              </div>

              <Button
                type="text"
                size="small"
                onClick={onClose}
                className="text-gray-400 hover:text-white p-1 h-6 w-6 flex items-center justify-center hover:bg-white/10 rounded-lg"
                title="Закрыть (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-2 border-b border-white/5 bg-[#12161c]">
            <Input
              prefix={<Search className="w-3 h-3 text-gray-500 mr-1" />}
              placeholder="Поиск по командам (/it, /politics, /breaking...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              autoFocus
              className="bg-white/5 border-white/10 text-xs text-white placeholder-gray-500 h-7 rounded-lg"
            />
          </div>

          {/* Filter Pills */}
          <div className="px-2 py-1 border-b border-white/5 flex items-center gap-1 overflow-x-auto custom-scrollbar text-[10px] bg-[#141820]">
            <button
              type="button"
              onClick={() => setActiveCategory('ALL')}
              className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-all ${
                activeCategory === 'ALL'
                  ? 'bg-primary text-black font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              Все
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('REDIRECT')}
              className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${
                activeCategory === 'REDIRECT'
                  ? 'bg-sky-500 text-white font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              <span>🔗</span>
              <span>Редиректы</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('AUXILIARY')}
              className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${
                activeCategory === 'AUXILIARY'
                  ? 'bg-emerald-500 text-black font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              <span>⚡</span>
              <span>Вспомогательные</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('TECH')}
              className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${
                activeCategory === 'TECH'
                  ? 'bg-purple-500 text-white font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              <span>💻</span>
              <span>IT & AI</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('SURVEY')}
              className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${
                activeCategory === 'SURVEY'
                  ? 'bg-amber-500 text-black font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              <span>🧭</span>
              <span>Опросы</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('CONTENT')}
              className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${
                activeCategory === 'CONTENT'
                  ? 'bg-rose-500 text-white font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              <span>🎨</span>
              <span>Контент</span>
            </button>
          </div>

          {/* Active Thread Notice */}
          {activeThreadTitle && (
            <div className="px-2.5 py-1 bg-black/30 border-b border-white/5 text-[9px] text-gray-400 flex items-center justify-between">
              <span className="truncate">
                Чат: <b className="text-gray-200">{activeThreadTitle}</b>
              </span>
              <span className="text-[9px] text-gray-500 flex-shrink-0">Esc закрыть</span>
            </div>
          )}

          {/* Content Area: Accordion vs Cards */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {filteredGrouped.length === 0 && filteredIndividualCommands.length === 0 ? (
              <div className="text-center py-8 px-3 bg-white/5 rounded-xl border border-white/5 text-gray-400 text-xs">
                <p>Команды не найдены</p>
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('ALL');
                  }}
                  className="text-primary text-xs mt-1"
                >
                  Сбросить поиск
                </Button>
              </div>
            ) : viewMode === 'accordion' ? (
              // =============================================================
              // ACCORDION VIEW: Compact list with info revealed on click
              // =============================================================
              <div className="space-y-1">
                {/* 1. Grouped Commands (Politics, IT, Breaking News) */}
                {filteredGrouped.map((group) => {
                  const groupKey = group.id.replace('group-', '');
                  const currentPeriodKey = selectedPeriods[groupKey] || 'today';
                  const activePeriod = group.periods.find((p) => p.key === currentPeriodKey) || group.periods[0];
                  const isExpanded = expandedCommandId === group.id;

                  return (
                    <div
                      key={group.id}
                      className={`rounded-lg border transition-all overflow-hidden ${
                        isExpanded
                          ? 'bg-[#1a2230] border-sky-500/40 shadow-md'
                          : 'bg-[#161d26]/80 border-white/5 hover:border-white/15 hover:bg-[#18202b]'
                      }`}
                    >
                      {/* Compact Header Row (Click to toggle accordion) */}
                      <div
                        onClick={() => toggleAccordion(group.id)}
                        className="px-2 py-1.5 flex items-center justify-between gap-1.5 cursor-pointer text-xs group/head"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm flex-shrink-0">{group.emoji}</span>
                          <span className="font-mono text-xs font-bold text-primary truncate">
                            {group.baseCommand}
                          </span>
                          <span className="text-[11px] text-gray-300 truncate hidden sm:inline">
                            {group.label}
                          </span>
                          <Tag
                            bordered={false}
                            className="bg-sky-500/20 text-sky-300 text-[9px] px-1 py-0 m-0 border border-sky-500/30 flex-shrink-0"
                          >
                            Редирект
                          </Tag>
                        </div>

                        {/* Quick Period Buttons / Status & Chevron */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <div className="flex items-center bg-black/40 rounded p-0.5 border border-white/10 text-[9px] font-mono">
                            {group.periods.map((p) => (
                              <button
                                key={p.key}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePeriodChange(groupKey, p.key, e);
                                  if (!isExpanded) {
                                    handleRedirect(p.command, e);
                                  }
                                }}
                                className={`px-1.5 py-0.2 rounded transition-colors ${
                                  currentPeriodKey === p.key
                                    ? 'bg-sky-600 text-white font-bold'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                                title={`Выбрать ${p.label} (${p.command})`}
                              >
                                {p.key === 'today' ? 'День' : p.key === 'week' ? 'Неделя' : 'Месяц'}
                              </button>
                            ))}
                          </div>

                          <ChevronDown
                            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-primary' : 'group-hover/head:text-white'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Expanded Accordion Body */}
                      {isExpanded && (
                        <div className="px-2.5 pb-2.5 pt-1 border-t border-white/10 bg-black/20 text-xs space-y-2 animate-in fade-in duration-150">
                          {/* Period Selector Tabs */}
                          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/5">
                            {group.periods.map((p) => (
                              <button
                                key={p.key}
                                type="button"
                                onClick={(e) => handlePeriodChange(groupKey, p.key, e)}
                                className={`flex-1 py-1 px-1.5 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 transition-all ${
                                  currentPeriodKey === p.key
                                    ? 'bg-sky-600 text-white font-bold shadow'
                                    : 'text-gray-300 hover:bg-white/10'
                                }`}
                              >
                                <span>{p.emoji}</span>
                                <span>{p.label}</span>
                              </button>
                            ))}
                          </div>

                          {/* Selected Period Info */}
                          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-semibold text-white">
                                {activePeriod.sublabel}
                              </span>
                              <span className="font-mono text-primary font-bold text-[10px]">
                                {activePeriod.command}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-300 leading-relaxed">
                              {activePeriod.description}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between gap-1 pt-1">
                            <Tooltip title="Скопировать команду в буфер">
                              <button
                                type="button"
                                onClick={(e) => handleCopy(activePeriod.command, e)}
                                className="h-6 px-2 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-[10px] flex items-center gap-1 border border-white/10 transition-colors"
                              >
                                {copiedCmd === activePeriod.command ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>Копировать</span>
                              </button>
                            </Tooltip>

                            <div className="flex items-center gap-1">
                              <Button
                                type="text"
                                size="small"
                                onClick={(e) => handleInsert(activePeriod.command, e)}
                                className="text-gray-300 hover:text-white hover:bg-white/10 text-[10px] h-6 px-2 rounded-md border border-white/10"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Вставить</span>
                              </Button>

                              <Button
                                type="primary"
                                size="small"
                                onClick={(e) => handleRedirect(activePeriod.command, e)}
                                className="bg-sky-600 hover:bg-sky-500 text-white text-[10px] h-6 px-2.5 rounded-md flex items-center gap-1 font-medium border-0"
                              >
                                <span>Перейти в тред</span>
                                <ArrowRight className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 2. Individual Commands Accordion List */}
                {filteredIndividualCommands.map((item) => {
                  const isRedirect = item.type === 'REDIRECT';
                  const isExpanded = expandedCommandId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-lg border transition-all overflow-hidden ${
                        isExpanded
                          ? 'bg-[#1a2230] border-white/20 shadow-md'
                          : isRedirect
                          ? 'bg-sky-950/15 border-sky-500/15 hover:border-sky-500/30'
                          : 'bg-[#161d26]/80 border-white/5 hover:border-white/15'
                      }`}
                    >
                      {/* Compact Header Row */}
                      <div
                        onClick={() => toggleAccordion(item.id)}
                        className="px-2 py-1.5 flex items-center justify-between gap-1.5 cursor-pointer text-xs group/item"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm flex-shrink-0">{item.emoji}</span>
                          <span className="font-mono text-xs font-bold text-primary truncate">
                            {item.command}
                          </span>
                          <span className="text-[11px] text-gray-300 truncate hidden sm:inline">
                            {item.label}
                          </span>
                          <Tag
                            bordered={false}
                            className={`text-[9px] px-1 py-0 m-0 border flex-shrink-0 ${
                              isRedirect
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {isRedirect ? 'Редирект' : 'В чате'}
                          </Tag>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isRedirect) {
                                handleRedirect(item.command, e);
                              } else {
                                handleRun(item.command, item.defaultPrompt, e);
                              }
                            }}
                            className={`h-5 px-1.5 rounded text-[10px] flex items-center gap-1 transition-all ${
                              isRedirect
                                ? 'bg-sky-500/20 text-sky-300 hover:bg-sky-500 hover:text-white'
                                : 'bg-primary/20 text-primary hover:bg-primary hover:text-black font-semibold'
                            }`}
                            title={isRedirect ? 'Перейти в тред' : 'Выполнить прямо сейчас'}
                          >
                            {isRedirect ? (
                              <ArrowRight className="w-2.5 h-2.5" />
                            ) : (
                              <Play className="w-2.5 h-2.5 fill-current" />
                            )}
                          </button>

                          <ChevronDown
                            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-primary' : 'group-item:text-white'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-2.5 pb-2.5 pt-1 border-t border-white/10 bg-black/20 text-xs space-y-2 animate-in fade-in duration-150">
                          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                            <h4 className="font-semibold text-white text-[11px] mb-0.5">
                              {item.label}
                            </h4>
                            <p className="text-[10px] text-gray-300 leading-relaxed">
                              {item.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-1 pt-1">
                            <Tooltip title="Скопировать команду">
                              <button
                                type="button"
                                onClick={(e) => handleCopy(item.command, e)}
                                className="h-6 px-2 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-[10px] flex items-center gap-1 border border-white/10 transition-colors"
                              >
                                {copiedCmd === item.command ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>Копировать</span>
                              </button>
                            </Tooltip>

                            <div className="flex items-center gap-1">
                              {isRedirect ? (
                                <Button
                                  type="primary"
                                  size="small"
                                  onClick={(e) => handleRedirect(item.command, e)}
                                  className="bg-sky-600 hover:bg-sky-500 text-white text-[10px] h-6 px-2.5 rounded-md flex items-center gap-1 font-medium border-0"
                                >
                                  <span>Перейти в тред</span>
                                  <ArrowRight className="w-3 h-3" />
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    type="text"
                                    size="small"
                                    onClick={(e) => handleInsert(item.command, e)}
                                    className="text-gray-300 hover:text-white hover:bg-white/10 text-[10px] h-6 px-2 rounded-md border border-white/10"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>Вставить</span>
                                  </Button>
                                  <Button
                                    type="primary"
                                    size="small"
                                    onClick={(e) => handleRun(item.command, item.defaultPrompt, e)}
                                    className="bg-primary hover:bg-primary/90 text-black font-bold text-[10px] h-6 px-2.5 rounded-md flex items-center gap-1 border-0"
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                    <span>Запустить</span>
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // =============================================================
              // COMPACT CARDS VIEW
              // =============================================================
              <div className="space-y-2">
                {/* 1. Grouped Cards (Politics, IT, Breaking News) */}
                {filteredGrouped.map((group) => {
                  const groupKey = group.id.replace('group-', '');
                  const currentPeriodKey = selectedPeriods[groupKey] || 'today';
                  const activePeriod = group.periods.find((p) => p.key === currentPeriodKey) || group.periods[0];

                  return (
                    <div
                      key={group.id}
                      className="p-2 rounded-xl border bg-sky-950/20 border-sky-500/25 hover:border-sky-500/40 transition-all space-y-1.5"
                    >
                      {/* Top Bar */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm">{group.emoji}</span>
                          <span className="font-mono text-xs font-bold text-primary truncate">
                            {group.baseCommand}
                          </span>
                          <Tooltip title="Скопировать текущую команду">
                            <button
                              type="button"
                              onClick={(e) => handleCopy(activePeriod.command, e)}
                              className="text-gray-500 hover:text-white p-0.5 rounded transition-colors"
                            >
                              {copiedCmd === activePeriod.command ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </Tooltip>
                        </div>

                        <Tag
                          bordered={false}
                          className="bg-sky-500/20 text-sky-300 text-[9px] px-1.5 py-0 m-0 border border-sky-500/30 uppercase font-mono"
                        >
                          🔗 Редирект
                        </Tag>
                      </div>

                      {/* Title & Period Selector */}
                      <div className="flex items-center justify-between gap-1 pt-0.5">
                        <h4 className="text-xs font-semibold text-white leading-snug truncate">
                          {group.label}
                        </h4>

                        {/* Period Selector Tabs */}
                        <div className="flex items-center bg-black/40 rounded p-0.5 border border-white/10 text-[9px] font-mono">
                          {group.periods.map((p) => (
                            <button
                              key={p.key}
                              type="button"
                              onClick={(e) => handlePeriodChange(groupKey, p.key, e)}
                              className={`px-1.5 py-0.5 rounded transition-all ${
                                currentPeriodKey === p.key
                                  ? 'bg-sky-600 text-white font-bold shadow'
                                  : 'text-gray-400 hover:text-white'
                              }`}
                            >
                              {p.label.replace('За ', '')}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Active Period Description */}
                      <p className="text-[10px] text-gray-300 leading-relaxed bg-white/5 p-1.5 rounded-lg border border-white/5">
                        <b className="text-white block mb-0.5">{activePeriod.sublabel}:</b>
                        {activePeriod.description}
                      </p>

                      {/* Action Button */}
                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/5">
                        <span className="font-mono text-[9px] text-sky-400">
                          {activePeriod.command}
                        </span>

                        <Button
                          type="primary"
                          size="small"
                          onClick={(e) => handleRedirect(activePeriod.command, e)}
                          className="bg-sky-600 hover:bg-sky-500 text-white text-[10px] h-6 px-2.5 rounded-lg flex items-center gap-1 font-medium border-0"
                        >
                          <span>Перейти в тред</span>
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {/* 2. Individual Cards */}
                {filteredIndividualCommands.map((item) => {
                  const isRedirect = item.type === 'REDIRECT';

                  return (
                    <div
                      key={item.id}
                      className={`p-2 rounded-xl border transition-all space-y-1.5 ${
                        isRedirect
                          ? 'bg-sky-950/20 border-sky-500/20 hover:border-sky-500/40'
                          : 'bg-[#1a202c]/60 border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm">{item.emoji}</span>
                          <span className="font-mono text-xs font-bold text-primary truncate">
                            {item.command}
                          </span>
                          <Tooltip title="Скопировать">
                            <button
                              type="button"
                              onClick={(e) => handleCopy(item.command, e)}
                              className="text-gray-500 hover:text-white p-0.5 rounded transition-colors"
                            >
                              {copiedCmd === item.command ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </Tooltip>
                        </div>

                        <Tag
                          bordered={false}
                          className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0 m-0 ${
                            isRedirect
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isRedirect ? '🔗 Редирект' : '⚡ В чате'}
                        </Tag>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-white leading-snug">
                          {item.label}
                        </h4>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-1 pt-1 border-t border-white/5">
                        {isRedirect ? (
                          <Button
                            type="primary"
                            size="small"
                            onClick={(e) => handleRedirect(item.command, e)}
                            className="bg-sky-600 hover:bg-sky-500 text-white text-[10px] h-6 px-2.5 rounded-lg flex items-center gap-1 font-medium border-0"
                          >
                            <span>Перейти в тред</span>
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        ) : (
                          <>
                            <Button
                              type="text"
                              size="small"
                              onClick={(e) => handleInsert(item.command, e)}
                              className="text-gray-300 hover:text-white hover:bg-white/10 text-[10px] h-6 px-2 rounded-lg flex items-center gap-1 border border-white/10"
                            >
                              <Edit3 className="w-3 h-3 text-gray-400" />
                              <span>Вставить</span>
                            </Button>

                            <Button
                              type="primary"
                              size="small"
                              onClick={(e) => handleRun(item.command, item.defaultPrompt, e)}
                              className="bg-primary hover:bg-primary/90 text-black font-bold text-[10px] h-6 px-2.5 rounded-lg flex items-center gap-1 border-0"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Запустить</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer info tip */}
          <div className="p-2 border-t border-white/10 bg-[#12161c] text-[10px] text-gray-400 flex items-start gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
            <div className="leading-tight">
              <span>
                Символ <code className="text-primary font-mono font-bold">/</code> в строке ввода откроет автоподстановку. Наведите на <code className="text-sky-300 font-mono">/politics</code>, <code className="text-sky-300 font-mono">/it</code> или <code className="text-sky-300 font-mono">/breaking</code> для выбора периода.
              </span>
            </div>
          </div>
        </aside>
      </div>
    );
  }
);

CommandsSidebar.displayName = 'CommandsSidebar';
