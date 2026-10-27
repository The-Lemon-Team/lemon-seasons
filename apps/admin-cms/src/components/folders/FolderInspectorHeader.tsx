import React from 'react';
import { Popconfirm } from 'antd';
import { Plus, FolderPlus, Globe, Lock, Trash2, X, Folder as FolderIcon } from 'lucide-react';
import { Folder, FolderPrivacy } from '../../types';
import { useAdminI18n } from '../../i18n';
import { renderFolderIcon } from './folderTree.utils';

export interface FolderInspectorHeaderProps {
  folder: Folder;
  notesCount?: number;
  onCreateNote: () => void;
  onAddSubfolder: (parentPath: string, parentPrivacy: FolderPrivacy) => void;
  onTogglePrivacy: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  onClose: () => void;
}

export const FolderInspectorHeader: React.FC<FolderInspectorHeaderProps> = ({
  folder,
  notesCount,
  onCreateNote,
  onAddSubfolder,
  onTogglePrivacy,
  onDeleteFolder,
  onClose,
}) => {
  const { t } = useAdminI18n();
  const isPrivate = folder.privacy === 'private';
  const effectiveColor = folder.color || (isPrivate ? '#a855f7' : '#c9cd58');

  return (
    <div className="platform-tile p-3 bg-tile border border-tile-border rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Left: Icon, Identity, Privacy Badge, Path */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border"
          style={{
            backgroundColor: isPrivate ? 'rgba(168, 85, 247, 0.15)' : 'rgba(201, 205, 88, 0.15)',
            borderColor: isPrivate ? 'rgba(168, 85, 247, 0.4)' : 'rgba(201, 205, 88, 0.4)',
            color: effectiveColor,
          }}
        >
          {renderFolderIcon(folder.icon || (isPrivate ? 'lock' : 'folder'), false, 'w-5 h-5')}
        </div>

        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-sans font-bold text-sm text-on-surface truncate">
              {folder.name}
            </h2>

            {/* Privacy Badge */}
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold inline-flex items-center gap-1 border ${
                isPrivate
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                  : 'bg-primary/15 border-primary/30 text-primary'
              }`}
            >
              {isPrivate ? (
                <>
                  <Lock className="w-2.5 h-2.5" />
                  <span>{t.folderPrivacyPrivate}</span>
                </>
              ) : (
                <>
                  <Globe className="w-2.5 h-2.5" />
                  <span>{t.folderPrivacyPublic}</span>
                </>
              )}
            </span>

            {notesCount !== undefined && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-tile-subtle text-on-surface-variant border border-tile-border">
                {notesCount} {t.notesCountBadge(notesCount)}
              </span>
            )}
          </div>

          <p className="text-[11px] font-mono text-on-surface-variant truncate max-w-xl" title={folder.path}>
            {folder.path}
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
        {/* Create Note */}
        <button
          type="button"
          onClick={onCreateNote}
          className="h-7 px-2.5 bg-primary text-on-primary hover:bg-primary-fixed-dim rounded-lg font-semibold text-xs transition-all flex items-center gap-1 shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.newNoteBtn}</span>
        </button>

        {/* Add Subfolder */}
        <button
          type="button"
          onClick={() => onAddSubfolder(folder.path, (folder.privacy as FolderPrivacy) || 'public')}
          className="h-7 px-2.5 bg-control hover:bg-tile-subtle text-on-surface border border-control-border rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
        >
          <FolderPlus className="w-3.5 h-3.5 text-primary" />
          <span>{t.addFolderBtn}</span>
        </button>

        {/* Toggle Privacy */}
        <button
          type="button"
          onClick={() => onTogglePrivacy(folder)}
          className={`h-7 px-2.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
            isPrivate
              ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/30'
              : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/30'
          }`}
          title={isPrivate ? t.makeFolderPublic : t.makeFolderPrivate}
        >
          {isPrivate ? (
            <>
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>{t.makeFolderPublic}</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span>{t.makeFolderPrivate}</span>
            </>
          )}
        </button>

        {/* Delete Folder */}
        <Popconfirm
          title={t.deleteFolderConfirm}
          description={`"${folder.name}" (${folder.path})`}
          onConfirm={() => onDeleteFolder(folder)}
          okText={t.deleteNoteBtn}
          cancelText={t.cancel}
          okButtonProps={{ danger: true }}
        >
          <button
            type="button"
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-control hover:bg-error/20 text-on-surface-variant hover:text-error border border-control-border transition-colors cursor-pointer"
            title={t.deleteNoteBtn}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </Popconfirm>

        {/* Close / Unselect folder */}
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-tile-subtle text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer ml-1"
          title={t.reset}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
