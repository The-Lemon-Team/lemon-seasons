import React from 'react';
import { Note, NoteTypeLabels, NoteTypeColors } from '@lenta/shared';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dayjs from 'dayjs';
import {
  X,
  Calendar,
  Clock,
  ExternalLink,
  Tag,
  Folder,
  Rss,
  Edit3,
  Image as ImageIcon,
  Share2,
} from 'lucide-react';

interface NoteDetailModalProps {
  note: Note | null;
  onClose: () => void;
}

export const NoteDetailModal: React.FC<NoteDetailModalProps> = ({ note, onClose }) => {
  if (!note) return null;

  const typeColor = NoteTypeColors[note.type] || NoteTypeColors.EVENT;
  const startDay = dayjs(note.startDate);
  const endDay = note.endDate ? dayjs(note.endDate) : null;
  const isMultiDay = endDay && !endDay.isSame(startDay, 'day');
  const durationDays = endDay ? Math.max(1, endDay.diff(startDay, 'day') + 1) : 1;

  const primaryFolder =
    note.folders?.find((f) => f.isPrimary)?.folder?.path ||
    note.folders?.[0]?.folder?.path;

  const mainImage = note.images?.find((img) => img.isMain) || note.images?.[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-[#1b1e1e] border border-[#323636] rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242828] bg-[#121414]/60">
          <div className="flex items-center gap-3">
            <span
              className="px-2.5 py-1 rounded text-xs font-mono font-medium border"
              style={{
                backgroundColor: typeColor.bg,
                color: typeColor.text,
                borderColor: typeColor.border,
              }}
            >
              {NoteTypeLabels[note.type]}
            </span>

            {note.feed && (
              <span className="text-xs font-mono text-[#c9c7b2] bg-[#282a2a] px-2.5 py-1 rounded border border-[#242828] flex items-center gap-1.5">
                <Rss className="w-3 h-3 text-[#c9cd58]" />
                <span>{note.feed.title}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Edit in Admin CMS */}
            <a
              href={`http://localhost:5173/notes/${note.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#121414] border border-[#484837] hover:border-[#c9cd58] text-xs font-mono text-[#c9c7b2] hover:text-[#e5e971] transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Note</span>
            </a>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1 rounded text-[#c9c7b2] hover:text-white hover:bg-[#333535] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Cover Banner if available */}
          {mainImage?.url && (
            <div className="w-full h-56 rounded-md overflow-hidden bg-[#121414] border border-[#242828] relative">
              <img
                src={mainImage.url}
                alt={mainImage.alt || note.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Title & Timing */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
              {note.title}
            </h2>

            {/* Date Time Metadata Bar */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#c9c7b2] bg-[#121414] p-3 rounded border border-[#242828]">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#c9cd58]" />
                <span>{startDay.format('MMMM D, YYYY')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#c9cd58]" />
                <span>{startDay.format('HH:mm')}</span>
              </div>
              {endDay && (
                <div className="flex items-center gap-1.5 text-[#93927e]">
                  <span>→</span>
                  <span>
                    {endDay.format('MMMM D, YYYY HH:mm')} ({durationDays} days)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Hierarchy & Taxonomy Inspector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            {primaryFolder && (
              <div className="bg-[#121414] p-3 rounded border border-[#242828] flex items-center gap-2">
                <Folder className="w-4 h-4 text-[#c9cd58]" />
                <div>
                  <span className="text-[#93927e] block text-[10px] uppercase">Folder</span>
                  <span className="text-white">{primaryFolder}</span>
                </div>
              </div>
            )}

            {note.sourceLink && (
              <div className="bg-[#121414] p-3 rounded border border-[#242828] flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-[#c9cd58]" />
                <div className="min-w-0 flex-1">
                  <span className="text-[#93927e] block text-[10px] uppercase">Source URL</span>
                  <a
                    href={note.sourceLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#e5e971] hover:underline truncate block"
                  >
                    {note.sourceLink}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Tags & Taxonomy Paths */}
          {((note.tags && note.tags.length > 0) || (note.hashtags && note.hashtags.length > 0)) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#242828]">
              {note.tags?.map((t) => (
                <span
                  key={t.id}
                  className="px-2.5 py-1 rounded bg-[#282a2a] border border-[#242828] text-xs font-mono text-[#c9c7b2] flex items-center gap-1.5"
                >
                  <Tag className="w-3 h-3 text-[#c9cd58]" />
                  <span>{t.path}</span>
                </span>
              ))}
              {note.hashtags?.map((h) => (
                <span
                  key={h.id}
                  className="px-2.5 py-1 rounded bg-[#c9cd58]/10 text-[#e5e971] text-xs font-mono font-medium"
                >
                  #{h.name.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}

          {/* Markdown Content Body */}
          {note.description && (
            <div className="border-t border-[#242828] pt-4">
              <h4 className="text-xs font-mono uppercase tracking-widest text-[#93927e] mb-3">
                Content & Notes
              </h4>
              <div className="prose-dark bg-[#121414] p-4 rounded border border-[#242828] text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note.description}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Secondary Image Gallery */}
          {note.images && note.images.length > 1 && (
            <div className="border-t border-[#242828] pt-4">
              <h4 className="text-xs font-mono uppercase tracking-widest text-[#93927e] mb-3 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Media Attachments ({note.images.length})</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {note.images.map((img) => (
                  <a
                    key={img.id}
                    href={img.url}
                    target="_blank"
                    rel="noreferrer"
                    className="h-28 rounded overflow-hidden bg-[#121414] border border-[#242828] group hover:border-[#c9cd58] transition-colors"
                  >
                    <img
                      src={img.thumbnailUrl || img.url}
                      alt={img.alt || note.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#242828] bg-[#121414]/60 flex items-center justify-between text-xs font-mono text-[#93927e]">
          <span>ID: {note.id}</span>
          <span>Updated: {dayjs(note.updatedAt).format('YYYY-MM-DD HH:mm')}</span>
        </div>
      </div>
    </div>
  );
};
