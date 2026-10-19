import React from 'react';
import { FolderTreeNode, FolderPrivacy } from '@lenta/shared';
import { FilePlus, FolderPlus } from 'lucide-react';
import { useI18n } from '../../i18n';

export interface FolderNodeActionDockProps {
  node: FolderTreeNode;
  isSelected?: boolean;
  onAddSubfolder: (path: string, privacy: FolderPrivacy) => void;
  onAddNote?: (folderPath: string, folderId: string) => void;
  onTogglePrivacyRequest?: (folderId: string, targetPrivacy: FolderPrivacy) => void;
  onDeleteRequest?: (folderId: string) => void;
}

/**
 * In-row hover actions micro-dock matching admin-cms FolderExplorer pattern.
 * Compact icon-only buttons that appear on hover without shifting layout or covering names.
 */
export const FolderNodeActionDock: React.FC<FolderNodeActionDockProps> = ({
  node,
  onAddSubfolder,
  onAddNote,
}) => {
  const { t } = useI18n();

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-0.5 shrink-0"
    >
      {/* 1. Quick Add Note */}
      {onAddNote && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddNote(node.path, node.id);
          }}
          title={`${t.createNoteInFolder} (${node.name})`}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-[#93927e] hover:text-[#e5e971] transition-all cursor-pointer"
        >
          <FilePlus className="w-3.5 h-3.5" />
        </button>
      )}

      {/* 2. Quick Add Subfolder */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAddSubfolder(node.path, node.privacy || 'public');
        }}
        title={`${t.addSubfolder} (${node.name})`}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-[#93927e] hover:text-[#e5e971] transition-all cursor-pointer"
      >
        <FolderPlus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

