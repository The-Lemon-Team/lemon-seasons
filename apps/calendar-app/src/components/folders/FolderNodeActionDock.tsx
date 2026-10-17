import React from 'react';
import { FolderTreeNode, FolderPrivacy } from '@lenta/shared';
import { Plus, FolderPlus, Lock, Globe, Trash2 } from 'lucide-react';

export interface FolderNodeActionDockProps {
  node: FolderTreeNode;
  isSelected: boolean;
  onAddSubfolder: (path: string, privacy: FolderPrivacy) => void;
  onAddNote?: (folderPath: string, folderId: string) => void;
  onTogglePrivacyRequest: (folderId: string, targetPrivacy: FolderPrivacy) => void;
  onDeleteRequest: (folderId: string) => void;
}

/**
 * Variant 1: In-row Floating / Hover Action Micro-Dock.
 * Placed directly inside the folder item row without causing vertical layout shifts.
 */
export const FolderNodeActionDock: React.FC<FolderNodeActionDockProps> = ({
  node,
  isSelected,
  onAddSubfolder,
  onAddNote,
  onTogglePrivacyRequest,
  onDeleteRequest,
}) => {
  const isPrivate = node.privacy === 'private';
  const targetPrivacy: FolderPrivacy = isPrivate ? 'public' : 'private';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`items-center gap-1 transition-opacity duration-150 shrink-0 ${
        isSelected ? 'flex opacity-100' : 'hidden group-hover:flex opacity-90 hover:opacity-100'
      }`}
    >
      {/* 1. Quick Add Note */}
      {onAddNote && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddNote(node.path, node.id);
          }}
          title="Создать заметку в этой папке"
          className="px-1.5 py-0.5 rounded bg-[#c9cd58]/20 hover:bg-[#c9cd58]/35 text-[#e5e971] border border-[#c9cd58]/40 font-mono text-[10px] font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-2.5 h-2.5" />
          <span className="hidden sm:inline">Заметка</span>
        </button>
      )}

      {/* 2. Quick Add Subfolder */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAddSubfolder(node.path, node.privacy || 'public');
        }}
        title="Добавить подпапку"
        className="px-1.5 py-0.5 rounded bg-[#1e2020] hover:bg-[#282a2a] text-[#c9c7b2] hover:text-white border border-[#383a3a] font-mono text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
      >
        <FolderPlus className="w-2.5 h-2.5 text-[#c9cd58]" />
        <span className="hidden md:inline">Папка</span>
      </button>

      {/* 3. Toggle Privacy (Lock / Globe) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTogglePrivacyRequest(node.id, targetPrivacy);
        }}
        title={isPrivate ? 'Сделать публичной' : 'Сделать приватной'}
        className="p-1 rounded bg-[#1e2020] hover:bg-[#282a2a] text-[#93927e] hover:text-[#d8b4fe] border border-[#383a3a] transition-colors cursor-pointer"
      >
        {isPrivate ? <Globe className="w-2.5 h-2.5 text-[#c9cd58]" /> : <Lock className="w-2.5 h-2.5 text-[#a855f7]" />}
      </button>

      {/* 4. Delete Folder */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm(`Удалить папку "${node.name}" и все её подпапки?`)) {
            onDeleteRequest(node.id);
          }
        }}
        title="Удалить папку"
        className="p-1 rounded bg-[#1e2020] hover:bg-[#ef4444]/20 text-[#93927e] hover:text-[#ef4444] border border-[#383a3a] transition-colors cursor-pointer"
      >
        <Trash2 className="w-2.5 h-2.5" />
      </button>
    </div>
  );
};
