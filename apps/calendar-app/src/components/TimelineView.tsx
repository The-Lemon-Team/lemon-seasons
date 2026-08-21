import React, { useRef, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Note,
  NoteType,
  NoteTypeLabels,
  NoteTypeColors,
  truncateMarkdown,
  formatLocalDateKey,
} from '@lenta/shared';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dayjs from 'dayjs';
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Tag,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

interface TimelineViewProps {
  notes: Note[];
  isLoading: boolean;
  onSelectNote: (note: Note) => void;
}

interface TimelineItem {
  type: 'header' | 'note';
  dateKey: string;
  displayDate: string;
  note?: Note;
  id: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  notes,
  isLoading,
  onSelectNote,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [expandedNoteIds, setExpandedNoteIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNoteIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Flatten notes into date groups
  const timelineItems: TimelineItem[] = useMemo(() => {
    const sorted = [...notes].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    const items: TimelineItem[] = [];
    let lastDateKey = '';

    for (const note of sorted) {
      const dateKey = formatLocalDateKey(note.startDate);
      if (dateKey !== lastDateKey) {
        lastDateKey = dateKey;
        const d = dayjs(note.startDate);
        items.push({
          type: 'header',
          dateKey,
          displayDate: d.format('MMMM D, YYYY'),
          id: `header-${dateKey}`,
        });
      }

      items.push({
        type: 'note',
        dateKey,
        displayDate: dayjs(note.startDate).format('HH:mm'),
        note,
        id: note.id,
      });
    }

    return items;
  }, [notes]);

  const virtualizer = useVirtualizer({
    count: timelineItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = timelineItems[index];
      if (item.type === 'header') return 44;
      if (item.note && expandedNoteIds[item.note.id]) return 260;
      return 150;
    },
    overscan: 8,
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-[#c9c7b2]">
        <div className="w-10 h-10 border-2 border-[#c9cd58] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono tracking-wider uppercase">Loading chronological feed...</p>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-[#c9c7b2]">
        <div className="w-16 h-16 rounded bg-[#1e2020] border border-[#242828] flex items-center justify-center text-3xl mb-4 shadow-sm">
          🍋
        </div>
        <h3 className="text-base font-semibold text-white mb-1">No chronological entries found</h3>
        <p className="text-xs text-[#c9c7b2] max-w-sm">
          Adjust the date slice or select other feed/taxonomy filters in the top toolbar.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 max-w-4xl mx-auto w-full relative"
      style={{ height: 'calc(100vh - 120px)' }}
    >
      <div
        className="w-full relative timeline-spine pl-6 md:pl-8 ml-2 md:ml-4"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = timelineItems[virtualRow.index];

          if (item.type === 'header') {
            return (
              <div
                key={item.id}
                ref={virtualizer.measureElement}
                data-index={virtualRow.index}
                className="absolute top-0 left-0 w-full py-1 z-10"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="sticky top-0 flex items-center gap-3 bg-[#121414]/95 backdrop-blur-md py-1 px-3 rounded border border-[#242828] w-fit">
                  <div className="w-2 h-2 rounded-full bg-[#c9cd58] shadow-glow-lemon -ml-5 mr-1" />
                  <span className="text-xs font-bold text-[#e5e971] font-mono tracking-wider uppercase">
                    {item.displayDate}
                  </span>
                </div>
              </div>
            );
          }

          const note = item.note!;
          const typeColor = NoteTypeColors[note.type] || NoteTypeColors.EVENT;
          const isExpanded = Boolean(expandedNoteIds[note.id]);
          const startDay = dayjs(note.startDate);
          const endDay = note.endDate ? dayjs(note.endDate) : null;
          const isMultiDay = endDay && !endDay.isSame(startDay, 'day');
          const previewText = truncateMarkdown(note.description, 220);
          const mainImage = note.images?.find((img) => img.isMain) || note.images?.[0];

          return (
            <div
              key={item.id}
              ref={virtualizer.measureElement}
              data-index={virtualRow.index}
              className="absolute top-0 left-0 w-full pb-4"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {/* Node Indicator Dot */}
              <div className="absolute -left-7 md:-left-9 top-4 w-2 h-2 rounded-full bg-[#333535] border border-[#121414] group-hover:bg-[#c9cd58] transition-colors" />

              {/* Card Panel */}
              <div
                onClick={() => onSelectNote(note)}
                className="group relative card-panel hover:border-[#484837] active-item rounded p-4 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-glow-lemon/10"
              >
                {/* Meta Top Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {/* Note Type Badge */}
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-mono font-medium border"
                      style={{
                        backgroundColor: typeColor.bg,
                        color: typeColor.text,
                        borderColor: typeColor.border,
                      }}
                    >
                      {NoteTypeLabels[note.type]}
                    </span>

                    {/* Feed Indicator */}
                    {note.feed && (
                      <span className="text-[11px] font-mono text-[#c9c7b2] bg-[#282a2a] px-2 py-0.5 rounded border border-[#242828]">
                        {note.feed.title}
                      </span>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1.5 text-xs font-mono text-[#c9c7b2]">
                    <Clock className="w-3.5 h-3.5 text-[#93927e]" />
                    <span>{startDay.format('HH:mm')}</span>
                    {isMultiDay && endDay && (
                      <span className="text-[#93927e]">
                        → {endDay.format('MMM D, HH:mm')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Layout */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-semibold text-white group-hover:text-[#e5e971] transition-colors leading-snug">
                      {note.title}
                    </h4>

                    {/* Markdown snippet */}
                    {note.description && (
                      <div className="mt-2">
                        {isExpanded ? (
                          <div className="prose-dark border-t border-[#242828] pt-2 mt-2">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {note.description}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-xs text-[#c9c7b2] line-clamp-2 leading-relaxed">
                            {previewText}
                          </p>
                        )}

                        {note.description.length > 200 && (
                          <button
                            onClick={(e) => toggleExpand(note.id, e)}
                            className="mt-1.5 text-[11px] font-mono text-[#c9cd58] hover:underline flex items-center gap-0.5"
                          >
                            {isExpanded ? (
                              <>
                                <span>Show less</span>
                                <ChevronUp className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                <span>Read full content</span>
                                <ChevronDown className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Cover Photo */}
                  {mainImage?.url && (
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded overflow-hidden bg-[#121414] border border-[#242828] flex-shrink-0">
                      <img
                        src={mainImage.thumbnailUrl || mainImage.url}
                        alt={mainImage.alt || note.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>

                {/* Tags Footer */}
                <div className="mt-3 pt-2 border-t border-[#242828] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Taxonomy */}
                    {note.tags?.map((t) => (
                      <span
                        key={t.id}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#282a2a] border border-[#242828] text-[11px] font-mono text-[#c9c7b2]"
                      >
                        <Tag className="w-2.5 h-2.5 text-[#c9cd58]" />
                        <span>{t.path}</span>
                      </span>
                    ))}

                    {/* Hashtags */}
                    {note.hashtags?.map((h) => (
                      <span
                        key={h.id}
                        className="px-1.5 py-0.5 rounded bg-[#c9cd58]/10 text-[#e5e971] text-[11px] font-mono"
                      >
                        #{h.name.replace(/^#/, '')}
                      </span>
                    ))}
                  </div>

                  {note.sourceLink && (
                    <a
                      href={note.sourceLink}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-[11px] font-mono text-[#c9c7b2] hover:text-[#e5e971] transition-colors"
                    >
                      <span>Source</span>
                      <ArrowUpRight className="w-3 h-3 text-[#c9cd58]" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
