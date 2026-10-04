import React from 'react';
import { getCuratorPersona } from '@lenta/shared';
import { ShieldCheck, Radar, Crown, User, Cpu } from 'lucide-react';

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
  showRole = false,
  className = '',
  onClick,
}) => {
  if (!curator) {
    return null;
  }

  const persona = curator ? getCuratorPersona(curator) : null;
  const isUserCurator = curator?.toLowerCase() === 'пользователь' || curator?.toLowerCase() === 'user';

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
      {curator && (
        <span
          className={`inline-flex items-center font-mono font-medium rounded border transition-colors ${sizeStyles} ${
            onClick ? 'cursor-pointer hover:opacity-90' : ''
          }`}
          style={{
            backgroundColor: persona
              ? persona.bgLight
              : isUserCurator
              ? 'rgba(52, 211, 153, 0.12)'
              : 'rgba(163, 163, 163, 0.12)',
            borderColor: persona
              ? persona.borderAccent
              : isUserCurator
              ? '#10b981'
              : '#525252',
            color: persona
              ? persona.accentColor
              : isUserCurator
              ? '#34d399'
              : '#d4d4d4',
          }}
          title={persona?.description || `Куратор: ${curator}`}
        >
          {persona ? (
            <>
              <span>{persona.emoji}</span>
              {persona.iconName === 'ShieldCheck' ? (
                <ShieldCheck className={iconSizes} />
              ) : persona.iconName === 'Cpu' ? (
                <Cpu className={iconSizes} />
              ) : (
                <Radar className={iconSizes} />
              )}
              <span>{persona.name}</span>
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

          {showRole && persona?.role && (
            <span className="opacity-70 text-[10px] border-l pl-1.5 ml-0.5 border-current">
              {persona.role}
            </span>
          )}
        </span>
      )}
    </div>
  );
};
