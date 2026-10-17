import React from 'react';
import { Note } from '@lenta/shared';
import { FileText, Search, Calendar, Tag } from 'lucide-react';
import dayjs from 'dayjs';
import { useI18n } from '../../i18n';

export interface FolderNotesGridProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  typeFilter: string;
  onTypeFilterChange: (val: string) => void;
}

export const FolderNotesGrid: React.FC<FolderNotesGridProps> = ({
  notes,
  onSelectNote,
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Notes Explorer Header & Filters */}
      <div className="px-5 py-3 border-b border-[#242828] bg-[#141616] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#c9cd58]" />
          <span className="font-mono font-bold text-xs text-[#e2e2e2]">
            {t.folderNotesCount(notes.length)}
          </span>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[#93927e]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t.searchNotesInFolder}
              className="bg-[#121414] border border-[#2d3030] focus:border-[#c9cd58] rounded pl-7 pr-2 py-1 text-xs font-mono text-[#e2e2e2] outline-none w-48 transition-colors"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="bg-[#121414] border border-[#2d3030] text-[#c9c7b2] rounded px-2 py-1 text-xs font-mono outline-none cursor-pointer"
          >
            <option value="all">Все типы</option>
            <option value="SINGLE">Одиночные</option>
            <option value="PERIOD">Периоды</option>
            <option value="EVENT">События</option>
            <option value="FILM_RELEASE">Релизы</option>
          </select>
        </div>
      </div>

      {/* Notes Cards Grid / List */}
      <div className="flex-1 overflow-y-auto p-5">
        {notes.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#2d3030] rounded-xl">
            <FileText className="w-10 h-10 text-[#444747] mb-2" />
            <p className="font-mono text-sm text-[#e2e2e2] font-semibold">
              {t.noNotesInFolder}
            </p>
            <p className="text-xs font-mono text-[#93927e] mt-1 max-w-sm">
              Добавьте новые записи через кнопку "Создать запись в папке"
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {notes.map((note) => (
              <div
                key={note.id}
                onClick={() => onSelectNote(note)}
                className="p-3.5 rounded-xl bg-[#181a1a] border border-[#282a2a] hover:border-[#c9cd58]/60 cursor-pointer transition-all hover:shadow-lg flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-[#121414] text-[#c9cd58] border border-[#2d3030]">
                      {note.type}
                    </span>
                    {note.feed && (
                      <span className="text-[#93927e] truncate max-w-[120px]">
                        {note.feed.title}
                      </span>
                    )}
                  </div>

                  <h4 className="font-semibold text-xs text-[#e2e2e2] group-hover:text-[#e5e971] transition-colors line-clamp-2">
                    {note.title}
                  </h4>

                  {note.description && (
                    <p className="text-[11px] text-[#93927e] line-clamp-2 leading-relaxed">
                      {note.description.replace(/#|\*|`|>|\[|\]/g, '')}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#242828] flex items-center justify-between text-[10px] font-mono text-[#93927e]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-[#c9cd58]" />
                    <span>
                      {dayjs(note.startDate).format('DD MMM YYYY')}
                    </span>
                  </div>

                  {note.tags && note.tags.length > 0 && (
                    <div className="flex items-center gap-1 text-[#3b82f6]">
                      <Tag className="w-2.5 h-2.5" />
                      <span className="truncate max-w-[90px]">{note.tags[0].name}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
