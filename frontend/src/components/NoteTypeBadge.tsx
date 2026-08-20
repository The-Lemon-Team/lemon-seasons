import React from 'react';
import { NoteType } from '../types';

interface NoteTypeBadgeProps {
  type: NoteType | string;
  size?: 'sm' | 'md';
}

const typeConfigs: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon?: string }
> = {
  SINGLE: {
    label: 'SINGLE',
    bg: 'bg-primary/15',
    text: 'text-primary',
    border: 'border-primary/25',
  },
  PERIOD: {
    label: 'PERIOD',
    bg: 'bg-secondary/15',
    text: 'text-secondary',
    border: 'border-secondary/25',
  },
  EVENT: {
    label: 'EVENT',
    bg: 'bg-tertiary/15',
    text: 'text-tertiary',
    border: 'border-tertiary/25',
  },
  FILM_RELEASE: {
    label: 'FILM RELEASE',
    bg: 'bg-[#e6e971]/15',
    text: 'text-[#e6e971]',
    border: 'border-[#e6e971]/25',
  },
  MENTION: {
    label: 'MENTION',
    bg: 'bg-[#bfecda]/15',
    text: 'text-[#bfecda]',
    border: 'border-[#bfecda]/25',
  },
  DONE: {
    label: 'DONE',
    bg: 'bg-[#a4d0bf]/20',
    text: 'text-[#a4d0bf]',
    border: 'border-[#a4d0bf]/30',
  },
};

export const NoteTypeBadge: React.FC<NoteTypeBadgeProps> = ({ type, size = 'md' }) => {
  const config = typeConfigs[type] || {
    label: type,
    bg: 'bg-white/10',
    text: 'text-on-surface',
    border: 'border-white/10',
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-1.5 py-0.5 text-[10px]'
      : 'px-2 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center font-mono font-semibold uppercase tracking-wider rounded-sm border ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      {config.label}
    </span>
  );
};
