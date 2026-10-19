import React from 'react';
import { Crown, User, Cpu } from 'lucide-react';

interface CuratorBadgeProps {
  curator?: string | null;
  size?: 'xs' | 'sm' | 'md';
  showRole?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const CuratorBadge: React.FC<CuratorBadgeProps> = ({
  curator,
  size = 'sm',
  className = '',
  onClick,
}) => {
  if (!curator || curator.toLowerCase() === 'auto') {
    return null;
  }

  const isUserCurator = curator.toLowerCase() === 'пользователь' || curator.toLowerCase() === 'user';
  const isSpark = curator.toLowerCase().includes('spark') || curator.toLowerCase().includes('gemini');

  // Base styling for size
  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-sm px-2.5 py-1 gap-2',
  }[size];

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  }[size];

  return (
    <div
      className={`inline-flex items-center flex-wrap gap-1.5 ${className}`}
      onClick={onClick}
    >
      <span
        className={`inline-flex items-center font-mono font-medium rounded border transition-colors ${sizeStyles} ${
          onClick ? 'cursor-pointer hover:opacity-90' : ''
        }`}
        style={{
          backgroundColor: isSpark
            ? 'rgba(201, 205, 88, 0.12)'
            : isUserCurator
            ? 'rgba(52, 211, 153, 0.12)'
            : 'rgba(59, 130, 246, 0.12)',
          borderColor: isSpark
            ? '#c9cd58'
            : isUserCurator
            ? '#10b981'
            : 'rgba(59, 130, 246, 0.3)',
          color: isSpark
            ? '#e5e971'
            : isUserCurator
            ? '#34d399'
            : '#93c5fd',
        }}
        title={`Автор / Источник: ${curator}`}
      >
        {isSpark ? (
          <>
            <span>⚡</span>
            <Cpu className={iconSizes} />
            <span>{curator}</span>
          </>
        ) : isUserCurator ? (
          <>
            <span>👑</span>
            <Crown className={iconSizes} />
            <span>Пользователь</span>
          </>
        ) : (
          <>
            <User className={iconSizes} />
            <span>{curator}</span>
          </>
        )}
      </span>
    </div>
  );
};
