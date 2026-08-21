import React from 'react';
import { useNavigate } from 'react-router-dom';

interface HashtagBadgeProps {
  name: string;
  count?: number;
  size?: 'xs' | 'sm' | 'md';
  onClick?: (name: string, e: React.MouseEvent) => void;
  onRemove?: (name: string, e: React.MouseEvent) => void;
  clickable?: boolean;
  className?: string;
}

export const HashtagBadge: React.FC<HashtagBadgeProps> = ({
  name,
  count,
  size = 'sm',
  onClick,
  onRemove,
  clickable = false,
  className = '',
}) => {
  const navigate = useNavigate();
  const cleanName = name.replace(/^#+/, '').toLowerCase();

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.2 gap-1',
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const isInteractive = clickable || Boolean(onClick);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(cleanName, e);
    } else if (clickable) {
      e.stopPropagation();
      navigate(`/notes?hashtag=${encodeURIComponent(cleanName)}`);
    }
  };

  return (
    <span
      onClick={isInteractive ? handleClick : undefined}
      className={`inline-flex items-center font-mono rounded-full border transition-all select-none ${
        sizeClasses[size]
      } ${
        isInteractive
          ? 'cursor-pointer bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 hover:text-cyan-200 border-cyan-700/40 hover:border-cyan-400/80 shadow-xs hover:shadow-cyan-900/20'
          : 'bg-cyan-950/30 text-cyan-400 border-cyan-800/30'
      } ${className}`}
      title={count !== undefined ? `#${cleanName} (${count} notes)` : `#${cleanName}`}
    >
      <span className="font-semibold text-cyan-500 opacity-80 select-none">#</span>
      <span className="truncate max-w-[200px]">{cleanName}</span>

      {count !== undefined && (
        <span className="text-[9px] px-1 py-0.2 rounded-full bg-cyan-900/60 text-cyan-300/80 border border-cyan-700/30">
          {count}
        </span>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(cleanName, e);
          }}
          className="p-0.5 -mr-0.5 hover:bg-cyan-800/60 rounded-full text-cyan-400 hover:text-red-400 transition-colors flex items-center justify-center cursor-pointer"
          title={`Remove #${cleanName}`}
        >
          <span className="material-symbols-outlined text-[12px] leading-none">close</span>
        </button>
      )}
    </span>
  );
};
