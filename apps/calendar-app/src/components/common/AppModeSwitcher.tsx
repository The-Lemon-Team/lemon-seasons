import React from 'react';
import { Terminal, ShieldCheck, Globe } from 'lucide-react';
import { AppRuntimeMode } from '@lenta/shared';
import { useAppMode } from '../../context/AppModeContext';

export interface AppModeSwitcherProps {
  className?: string;
  compact?: boolean;
}

const MODES: Array<{
  id: AppRuntimeMode;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClasses: string;
  badgeClasses: string;
}> = [
  {
    id: 'dev',
    label: 'Dev (Admin)',
    shortLabel: 'Dev',
    description: 'Контур разработки (Dev): приватные и рабочие заметки',
    icon: Terminal,
    activeClasses: 'bg-indigo-600/25 text-indigo-300 border-indigo-500/40 shadow-xs font-semibold',
    badgeClasses: 'bg-indigo-500/20 text-indigo-300',
  },
  {
    id: 'staging',
    label: 'Staging',
    shortLabel: 'Staging',
    description: 'Контур премодерации (Staging): заметки на проверке перед выходом в паблик',
    icon: ShieldCheck,
    activeClasses: 'bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-xs font-semibold',
    badgeClasses: 'bg-amber-500/25 text-amber-300',
  },
  {
    id: 'public',
    label: 'Public',
    shortLabel: 'Public',
    description: 'Публичный контур (Public): одобренные и опубликованные новости',
    icon: Globe,
    activeClasses: 'bg-emerald-600/25 text-emerald-300 border-emerald-500/50 shadow-xs font-semibold',
    badgeClasses: 'bg-emerald-500/25 text-emerald-300',
  },
];

export const AppModeSwitcher: React.FC<AppModeSwitcherProps> = ({ className = '', compact = false }) => {
  const { appMode, setAppMode } = useAppMode();

  return (
    <div
      role="tablist"
      aria-label="Режим ленты приложения"
      className={`inline-flex items-center p-1 rounded-xl bg-[#181a1a] border border-[#282c2c] transition-colors select-none ${className}`}
    >
      {MODES.map((mode) => {
        const isActive = appMode === mode.id;
        const Icon = mode.icon;

        return (
          <button
            key={mode.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => setAppMode(mode.id)}
            title={mode.description}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-mono transition-all duration-150 cursor-pointer border ${
              isActive
                ? `${mode.activeClasses} border`
                : 'border-transparent text-[#93927e] hover:text-[#e2e2e2] hover:bg-[#202424]'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'scale-105' : 'opacity-70'}`} />
            <span className={compact ? 'text-[11px]' : 'text-xs'}>
              {compact ? mode.shortLabel : mode.label}
            </span>

            {/* Status indicator dot */}
            {isActive && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  mode.id === 'public'
                    ? 'bg-emerald-400 animate-pulse'
                    : mode.id === 'staging'
                    ? 'bg-amber-400'
                    : 'bg-indigo-400'
                }`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
