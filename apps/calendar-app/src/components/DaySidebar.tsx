import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Note } from '@lenta/shared';
import dayjs from 'dayjs';
import { useDailySummaryQuery } from '../api/queries';
import { useI18n } from '../i18n';
import { DaySidebarHeader } from './daySidebar/DaySidebarHeader';
import { DaySummaryPod } from './daySidebar/DaySummaryPod';
import { DayFeedStream } from './daySidebar/DayFeedStream';
import { CreateNoteModal } from './CreateNoteModal';
import { EditNoteModal } from './EditNoteModal';

interface DaySidebarProps {
  isOpen: boolean;
  dateKey: string | null;
  notes: Note[];
  onClose: () => void;
  onSelectNote: (note: Note) => void;
  onNavigateToTimeline?: (dateKey: string) => void;
  onSelectDate?: (dateKey: string) => void;
}

export const DaySidebar: React.FC<DaySidebarProps> = ({
  isOpen,
  dateKey,
  notes,
  onClose,
  onSelectNote,
  onNavigateToTimeline,
  onSelectDate,
}) => {
  const { t } = useI18n();
  const backdropMouseDownRef = useRef(false);

  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const { data: summaryData } = useDailySummaryQuery(dateKey);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const targetDate = useMemo(() => {
    return dateKey ? dayjs(dateKey) : dayjs();
  }, [dateKey]);

  const relativeBadge = useMemo(() => {
    if (!dateKey) return null;
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');

    if (dateKey === today) {
      return { label: t.today, isCurrent: true };
    }
    if (dateKey === yesterday) {
      return { label: t.yesterday, isCurrent: false };
    }
    if (dateKey === tomorrow) {
      return { label: t.tomorrow, isCurrent: false };
    }
    return null;
  }, [dateKey, t]);

  if (!isOpen || !dateKey) return null;

  const handlePrevDay = () => {
    if (onSelectDate) {
      const prev = targetDate.subtract(1, 'day').format('YYYY-MM-DD');
      onSelectDate(prev);
    }
  };

  const handleNextDay = () => {
    if (onSelectDate) {
      const next = targetDate.add(1, 'day').format('YYYY-MM-DD');
      onSelectDate(next);
    }
  };

  return (
    <>
      {/* Subtle backdrop on mobile */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
        onMouseDown={(e) => {
          backdropMouseDownRef.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (backdropMouseDownRef.current && e.target === e.currentTarget) {
            onClose();
          }
          backdropMouseDownRef.current = false;
        }}
      />

      <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] lg:w-[460px] bg-[#161819] border-l border-[#242828] shadow-2xl flex flex-col animate-fade-in text-[#e2e2e2]">
        {/* 1. Header with Stepper & Quick Action */}
        <DaySidebarHeader
          targetDate={targetDate}
          dateKey={dateKey}
          notesCount={notes.length}
          relativeBadge={relativeBadge}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          onClose={onClose}
          onOpenCreateNote={() => setIsCreateNoteOpen(true)}
          onNavigateToTimeline={onNavigateToTimeline}
        />

        {/* 2. Daily AI Synthesis & NotebookLM Podcast Audio */}
        <DaySummaryPod summaryData={summaryData} />

        {/* 3. Convenient Today's Notes Feed Stream */}
        <DayFeedStream
          notes={notes}
          targetDate={targetDate}
          dateKey={dateKey}
          onSelectNote={onSelectNote}
          onEditNote={(note) => setEditingNote(note)}
          onOpenCreateNote={() => setIsCreateNoteOpen(true)}
        />

        {/* 4. Footer Help info */}
        <div className="p-3 border-t border-[#242828] bg-[#121414] text-[11px] font-mono text-[#93927e] flex items-center justify-between px-5">
          <span>{t.pressEsc}</span>
          <span className="text-[10px] text-neutral-500">Lemon Seasons Feed Drawer</span>
        </div>
      </aside>

      {/* Note Creation Modal */}
      <CreateNoteModal
        isOpen={isCreateNoteOpen}
        onClose={() => setIsCreateNoteOpen(false)}
        initialFolderPath="Seasons"
      />

      {/* Note Edit Modal */}
      <EditNoteModal
        note={editingNote}
        isOpen={Boolean(editingNote)}
        onClose={() => setEditingNote(null)}
      />
    </>
  );
};
