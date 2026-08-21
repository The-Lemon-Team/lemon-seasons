import { NoteType } from '../types';

export interface NoteTypeMeta {
  value: NoteType;
  label: string;
  description: string;
  icon: string;
  bg: string;
  text: string;
  border: string;
  accentHex: string;
}

export const NOTE_TYPE_CONFIGS: Record<NoteType, NoteTypeMeta> = {
  SINGLE: {
    value: 'SINGLE',
    label: 'SINGLE',
    description: 'One-off milestone or post',
    icon: 'push_pin',
    bg: 'bg-primary/15',
    text: 'text-primary',
    border: 'border-primary/25',
    accentHex: '#c9cd58',
  },
  PERIOD: {
    value: 'PERIOD',
    label: 'PERIOD',
    description: 'Span with start and end',
    icon: 'date_range',
    bg: 'bg-secondary/15',
    text: 'text-secondary',
    border: 'border-secondary/25',
    accentHex: '#c9c8a5',
  },
  EVENT: {
    value: 'EVENT',
    label: 'EVENT',
    description: 'Scheduled conference / meeting',
    icon: 'event',
    bg: 'bg-tertiary/15',
    text: 'text-tertiary',
    border: 'border-tertiary/25',
    accentHex: '#a4d0be',
  },
  FILM_RELEASE: {
    value: 'FILM_RELEASE',
    label: 'FILM RELEASE',
    description: 'Media premiere',
    icon: 'movie',
    bg: 'bg-[#e6e971]/15',
    text: 'text-[#e6e971]',
    border: 'border-[#e6e971]/25',
    accentHex: '#e6e971',
  },
  MENTION: {
    value: 'MENTION',
    label: 'MENTION',
    description: 'Reference / citation',
    icon: 'alternate_email',
    bg: 'bg-[#bfecda]/15',
    text: 'text-[#bfecda]',
    border: 'border-[#bfecda]/25',
    accentHex: '#bfecda',
  },
  DONE: {
    value: 'DONE',
    label: 'DONE',
    description: 'Completed deliverable',
    icon: 'task_alt',
    bg: 'bg-[#a4d0bf]/20',
    text: 'text-[#a4d0bf]',
    border: 'border-[#a4d0bf]/30',
    accentHex: '#a4d0bf',
  },
};

export const NOTE_TYPE_LIST: NoteTypeMeta[] = Object.values(NOTE_TYPE_CONFIGS);
