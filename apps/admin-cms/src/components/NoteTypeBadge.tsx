import React from 'react';
import { NoteType } from '../types';
import { NOTE_TYPE_CONFIGS } from '../constants/noteTypes';
import { useAdminI18n } from '../i18n';

interface NoteTypeBadgeProps {
  type: NoteType | string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const NoteTypeBadge: React.FC<NoteTypeBadgeProps> = ({
  type,
  size = 'md',
  showIcon = true,
}) => {
  const { getTypeLabel } = useAdminI18n();
  const config = (NOTE_TYPE_CONFIGS as any)[type] || {
    label: type,
    bg: 'bg-white/10',
    text: 'text-on-surface',
    border: 'border-white/10',
    icon: 'label',
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-1.5 py-0.5 text-[10px] gap-1'
      : 'px-2 py-0.5 text-[11px] gap-1.5';

  const iconSize = size === 'sm' ? 'text-[12px]' : 'text-[14px]';
  const label = typeof type === 'string' && (NOTE_TYPE_CONFIGS as any)[type] ? getTypeLabel(type as NoteType) : config.label;

  return (
    <span
      className={`inline-flex items-center font-mono font-semibold uppercase tracking-wider rounded-sm border ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      {showIcon && config.icon && (
        <span className={`material-symbols-outlined shrink-0 ${iconSize}`}>
          {config.icon}
        </span>
      )}
      <span>{label}</span>
    </span>
  );
};


