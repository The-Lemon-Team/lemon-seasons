import React from 'react';
import { Popconfirm } from 'antd';
import { FilePlus, FolderPlus, Globe, Lock, Trash2 } from 'lucide-react';
import { FolderTreeNode, FolderPrivacy } from '../../types';
import { useAdminI18n } from '../../i18n';

export interface FolderNodeActionDockProps {
  node: FolderTreeNode;
  onAddSubfolder: (parentPath: string, parentPrivacy: FolderPrivacy) => void;
  onAddNote?: (folderPath: string) => void;
  onTogglePrivacy: (node: FolderTreeNode) => void;
  onDeleteFolder: (node: FolderTreeNode) => void;
}

export const FolderNodeActionDock: React.FC<FolderNodeActionDockProps> = ({
  node,
  onAddSubfolder,
  onAddNote,
  onTogglePrivacy,
  onDeleteFolder,
}) => {
  const { t } = useAdminI18n();
  const isPrivate = node.privacy === 'private';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
    >
      {/* 1. Quick Add Note */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onAddNote) onAddNote(node.path);
        }}
        title={`${t.newNoteBtn} (${node.name})`}
        className="p-1 rounded hover:bg-tile-subtle text-on-surface-variant hover:text-primary transition-all cursor-pointer"
      >
        <FilePlus className="w-3.5 h-3.5" />
      </button>

      {/* 2. Quick Add Subfolder */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAddSubfolder(node.path, (node.privacy as FolderPrivacy) || 'public');
        }}
        title={`${t.addFolderBtn} (${node.name})`}
        className="p-1 rounded hover:bg-tile-subtle text-on-surface-variant hover:text-primary transition-all cursor-pointer"
      >
        <FolderPlus className="w-3.5 h-3.5" />
      </button>

      {/* 3. Quick Toggle Privacy */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTogglePrivacy(node);
        }}
        title={isPrivate ? t.makeFolderPublic : t.makeFolderPrivate}
        className={`p-1 rounded transition-all cursor-pointer ${
          isPrivate
            ? 'hover:bg-purple-500/20 text-purple-400 hover:text-purple-300'
            : 'hover:bg-primary/20 text-primary/70 hover:text-primary'
        }`}
      >
        {isPrivate ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
      </button>

      {/* 4. Delete Folder with Popconfirm */}
      <Popconfirm
        title={t.deleteFolderConfirm}
        description={`"${node.name}"`}
        onConfirm={(e) => {
          e?.stopPropagation();
          onDeleteFolder(node);
        }}
        okText={t.deleteNoteBtn}
        cancelText={t.cancel}
        okButtonProps={{ danger: true }}
      >
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          title={t.deleteNoteBtn}
          className="p-1 rounded hover:bg-error/20 text-on-surface-variant hover:text-error transition-all cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </Popconfirm>
    </div>
  );
};
