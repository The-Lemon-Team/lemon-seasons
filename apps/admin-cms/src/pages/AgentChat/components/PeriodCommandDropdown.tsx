import React, { useState } from 'react';
import { Dropdown } from 'antd';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { GroupedCommandMeta, PeriodOption } from './commandRegistry';

interface PeriodCommandDropdownProps {
  group: GroupedCommandMeta;
  onExecuteCommand: (command: string, customPrompt?: string) => void;
  onInsertCommand?: (command: string) => void;
  placement?: 'top' | 'topLeft' | 'topRight' | 'bottom' | 'bottomLeft' | 'bottomRight';
  className?: string;
  size?: 'small' | 'middle';
}

export const PeriodCommandDropdown: React.FC<PeriodCommandDropdownProps> = React.memo(
  ({
    group,
    onExecuteCommand,
    onInsertCommand,
    placement = 'top',
    className = '',
  }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleSelectPeriod = (period: PeriodOption, e: React.MouseEvent) => {
      e.stopPropagation();
      setIsMenuOpen(false);
      onExecuteCommand(period.command, period.defaultPrompt);
    };

    const handleMainClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      // Default to "today" command on direct main button click
      const todayPeriod = group.periods.find((p) => p.key === 'today') || group.periods[0];
      if (todayPeriod) {
        onExecuteCommand(todayPeriod.command, todayPeriod.defaultPrompt);
      }
    };

    const dropdownContent = (
      <div className="bg-[#1c2128] border border-white/15 rounded-xl shadow-2xl p-1.5 w-72 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-2 py-1.5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm">{group.emoji}</span>
            <span className="font-semibold text-white truncate">{group.label}</span>
          </div>
          <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
            {group.baseCommand}
          </span>
        </div>

        {/* Period Options List */}
        <div className="py-1 space-y-1">
          {group.periods.map((period) => (
            <button
              key={period.key}
              type="button"
              onClick={(e) => handleSelectPeriod(period, e)}
              className="w-full text-left p-2 rounded-lg transition-all flex items-start gap-2 hover:bg-white/10 group/item border border-transparent hover:border-white/10 cursor-pointer"
            >
              <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-sm flex-shrink-0 group-hover/item:bg-primary/20 group-hover/item:text-primary transition-colors">
                {period.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-medium text-white group-hover/item:text-primary transition-colors">
                    {period.label}
                  </span>
                  <span className="text-[10px] font-mono text-sky-300 opacity-80 group-hover/item:opacity-100">
                    {period.command}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1 leading-snug">
                  {period.description}
                </p>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover/item:text-primary group-hover/item:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
            </button>
          ))}
        </div>

        {/* Footer tip */}
        <div className="pt-1.5 pb-0.5 px-2 border-t border-white/5 flex items-center justify-between text-[9px] text-gray-400">
          <span>Нажмите на период для быстрого перехода</span>
          <span className="text-primary font-mono">{group.periods.length} периода</span>
        </div>
      </div>
    );

    return (
      <Dropdown
        dropdownRender={() => dropdownContent}
        trigger={['hover', 'click']}
        placement={placement}
        open={isMenuOpen}
        onOpenChange={setIsMenuOpen}
      >
        <div className={`inline-flex items-center ${className}`}>
          <button
            type="button"
            onClick={handleMainClick}
            className={`h-6 flex items-center gap-1 px-2 rounded-md text-[11px] font-mono transition-all flex-shrink-0 border bg-sky-950/40 border-sky-500/30 text-sky-200 hover:bg-sky-900/50 hover:border-sky-400 ${
              isMenuOpen ? 'bg-sky-900/60 border-sky-400 text-white shadow-sm ring-1 ring-sky-500/30' : ''
            }`}
          >
            <span className="text-xs">{group.emoji}</span>
            <span className="font-semibold">{group.baseCommand}</span>
            <ChevronDown
              className={`w-2.5 h-2.5 ml-0.5 text-sky-300 transition-transform duration-150 ${
                isMenuOpen ? 'rotate-180 text-white' : 'opacity-70'
              }`}
            />
          </button>
        </div>
      </Dropdown>
    );
  }
);

PeriodCommandDropdown.displayName = 'PeriodCommandDropdown';
