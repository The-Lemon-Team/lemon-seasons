import React from 'react';
import {
  Folder,
  Radio,
  Cpu,
  Code,
  Flame,
  Globe,
  Sparkles,
  Layers,
  FileText,
  Newspaper,
  Terminal,
} from 'lucide-react';

export interface FeedTabPillProps {
  id?: string;
  label: string;
  emoji?: string;
  iconName?: string;
  count?: number;
  isActive?: boolean;
  accentColor?: string;
  onClick?: () => void;
  size?: 'sm' | 'md';
  className?: string;
  title?: string;
}

function resolveIcon(iconName?: string, emoji?: string, iconClass = 'w-3.5 h-3.5') {
  if (emoji) {
    return <span className="text-xs leading-none shrink-0">{emoji}</span>;
  }
  switch ((iconName || '').toLowerCase()) {
    case 'cpu':
    case 'ai':
      return <Cpu className={iconClass} />;
    case 'code':
    case 'terminal':
      return <Terminal className={iconClass} />;
    case 'sparkles':
      return <Sparkles className={iconClass} />;
    case 'layers':
      return <Layers className={iconClass} />;
    case 'news':
    case 'newspaper':
      return <Newspaper className={iconClass} />;
    case 'globe':
      return <Globe className={iconClass} />;
    case 'flame':
    case 'fire':
      return <Flame className={iconClass} />;
    case 'radio':
      return <Radio className={iconClass} />;
    default:
      return <Folder className={iconClass} />;
  }
}

export const FeedTabPill: React.FC<FeedTabPillProps> = ({
  label,
  emoji,
  iconName,
  count,
  isActive = false,
  accentColor,
  onClick,
  size = 'md',
  className = '',
  title,
}) => {
  const isSmall = size === 'sm';
  const sizeClasses = isSmall
    ? 'px-2 py-0.5 text-[11px] gap-1.5'
    : 'px-2.5 py-1 text-xs gap-1.5';

  const badgeText = count !== undefined ? (count > 999 ? '999+' : String(count)) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title || label}
      className={`inline-flex items-center justify-center rounded-full font-medium transition-colors duration-150 select-none cursor-pointer whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-[#2481cc]/40 shrink-0 border ${sizeClasses} ${
        isActive
          ? 'bg-[#2481cc] dark:bg-[#3390ec] text-white border-transparent shadow-xs'
          : 'bg-white/90 hover:bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-[#1a2430] dark:hover:bg-[#243343] dark:text-[#9bb2c9] dark:border-white/[0.08]'
      } ${className}`}
    >
      {/* Icon or Emoji */}
      {resolveIcon(iconName, emoji)}

      {/* Label */}
      <span className="truncate max-w-[130px] sm:max-w-[180px] leading-tight">
        {label}
      </span>

      {/* Counter Badge */}
      {badgeText !== null && (
        <span
          className={`px-1.5 py-0.2 rounded-full font-semibold text-[10px] leading-tight transition-colors shrink-0 ${
            isActive
              ? 'bg-white/25 text-white'
              : 'bg-slate-200/90 text-slate-600 dark:bg-white/10 dark:text-[#8ea2b7]'
          }`}
        >
          {badgeText}
        </span>
      )}
    </button>
  );
};
