import React from 'react';
import { Folder, FolderPrivacy } from '@lenta/shared';
import { Plus, FolderPlus, Globe, Lock, Trash2 } from 'lucide-react';
import { renderFolderIcon } from '../../utils/folders.utils';
import { useI18n } from '../../i18n';

export interface FolderInspectorHeaderProps {
  folder: Folder;
  onCreateNote: () => void;
  onAddSubfolder: (parentPath: string, privacy: FolderPrivacy) => void;
  onTogglePrivacy: (folderId: string, targetPrivacy: FolderPrivacy) => void;
  onDeleteFolder: (folderId: string) => void;
}

export const FolderInspectorHeader: React.FC<FolderInspectorHeaderProps> = ({
  folder,
  onCreateNote,
  onAddSubfolder,
  onTogglePrivacy,
  onDeleteFolder,
}) => {
  const { t } = useI18n();
  const isPrivate = folder.privacy === 'private';
  const targetPrivacy: FolderPrivacy = isPrivate ? 'public' : 'private';

  return (
    <div className="p-5 border-b border-[#242828] bg-[#161818] flex flex-col gap-4 shrink-0">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Left: Folder Icon & Identity */}
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl border shrink-0"
            style={{
              backgroundColor: isPrivate ? 'rgba(168,85,247,0.15)' : 'rgba(201,205,88,0.15)',
              borderColor: isPrivate ? 'rgba(168,85,247,0.4)' : 'rgba(201,205,88,0.4)',
              color: isPrivate ? '#d8b4fe' : '#e5e971',
            }}
          >
            {renderFolderIcon(folder.icon, 'w-6 h-6')}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-sans font-bold text-lg text-[#e2e2e2]">
                {folder.name}
              </h2>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold flex items-center gap-1 ${
                  isPrivate
                    ? 'bg-[#a855f7]/20 text-[#d8b4fe] border border-[#a855f7]/40'
                    : 'bg-[#c9cd58]/20 text-[#e5e971] border border-[#c9cd58]/40'
                }`}
              >
                {isPrivate ? (
                  <>
                    <Lock className="w-2.5 h-2.5" />
                    <span>Приватная</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-2.5 h-2.5" />
                    <span>Публичная</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-xs font-mono text-[#93927e] mt-0.5 truncate max-w-md">
              {folder.path}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onCreateNote}
            className="px-3 py-1.5 rounded-lg bg-[#c9cd58] hover:bg-[#d8db6f] text-[#121414] font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.createNoteInFolder}</span>
          </button>

          <button
            type="button"
            onClick={() => onAddSubfolder(folder.path, folder.privacy || 'public')}
            className="px-3 py-1.5 rounded-lg bg-[#1e2020] hover:bg-[#282a2a] text-[#c9c7b2] hover:text-white border border-[#383a3a] font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#c9cd58]" />
            <span>{t.addSubfolder}</span>
          </button>

          <button
            type="button"
            onClick={() => onTogglePrivacy(folder.id, targetPrivacy)}
            className="px-3 py-1.5 rounded-lg bg-[#1e2020] hover:bg-[#282a2a] text-[#c9c7b2] hover:text-white border border-[#383a3a] font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isPrivate ? (
              <>
                <Globe className="w-3.5 h-3.5 text-[#c9cd58]" />
                <span>Сделать публичной</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-[#a855f7]" />
                <span>Сделать приватной</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Удалить папку "${folder.name}" и все её подпапки?`)) {
                onDeleteFolder(folder.id);
              }
            }}
            className="p-2 rounded-lg bg-[#1e2020] hover:bg-[#ef4444]/20 text-[#93927e] hover:text-[#ef4444] border border-[#383a3a] transition-colors cursor-pointer"
            title="Удалить папку"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
