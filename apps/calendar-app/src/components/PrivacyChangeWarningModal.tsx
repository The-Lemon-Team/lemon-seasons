import React from 'react';
import { useI18n } from '../i18n';
import { PrivacyImpact } from '../context/FoldersContext';
import { ContainerPrivacyImpact } from '../context/ObsidianContainersContext';
import {
  AlertTriangle,
  Lock,
  Globe,
  X,
  Check,
  Layers,
  FileText,
  ShieldAlert,
  Info,
} from 'lucide-react';

interface PrivacyChangeWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderImpact?: PrivacyImpact | null;
  containerImpact?: ContainerPrivacyImpact | null;
  onConfirm: () => void;
}

export const PrivacyChangeWarningModal: React.FC<PrivacyChangeWarningModalProps> = ({
  isOpen,
  onClose,
  folderImpact,
  containerImpact,
  onConfirm,
}) => {
  const { t } = useI18n();

  if (!isOpen || (!folderImpact && !containerImpact)) return null;

  const isFolder = Boolean(folderImpact);
  const title = isFolder ? folderImpact?.folderName : containerImpact?.containerName;
  const pathOrId = isFolder ? folderImpact?.folderPath : containerImpact?.containerId;
  const currentPrivacy = isFolder ? folderImpact?.currentPrivacy : containerImpact?.currentPrivacy;
  const targetPrivacy = isFolder ? folderImpact?.targetPrivacy : containerImpact?.targetPrivacy;
  const hasConflict = isFolder ? folderImpact?.hasConflict : containerImpact?.hasConflict;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#181a1a] border border-[#383a3a] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#242828] flex items-center justify-between bg-[#1f2121]">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${hasConflict ? 'bg-[#ef4444]/20 text-[#ef4444]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm text-[#e2e2e2]">
                {t.privacyChangeWarningTitle}
              </h3>
              <p className="text-[11px] font-mono text-[#93927e]">
                {t.privacyChangeWarningDesc}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#93927e] hover:text-[#e2e2e2] hover:bg-[#282a2a] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans text-[#c9c7b2]">
          {/* Target Element & Privacy Shift Card */}
          <div className="p-3.5 rounded-lg bg-[#141616] border border-[#2d3030] flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#93927e] block">
                {isFolder ? t.folders : t.obsidianHub}
              </span>
              <p className="font-mono font-bold text-sm text-[#e5e971] truncate">
                {title}
              </p>
              <p className="text-[11px] font-mono text-[#93927e] truncate">
                {pathOrId}
              </p>
            </div>

            {/* Privacy Transition Indicator */}
            <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
              <span className={`px-2 py-1 rounded flex items-center gap-1.5 ${
                currentPrivacy === 'private' ? 'bg-[#a855f7]/20 text-[#d8b4fe]' : 'bg-[#c9cd58]/20 text-[#e5e971]'
              }`}>
                {currentPrivacy === 'private' ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                {currentPrivacy === 'private' ? t.folderPrivacyPrivate : t.folderPrivacyPublic}
              </span>

              <span className="text-[#93927e]">➔</span>

              <span className={`px-2 py-1 rounded flex items-center gap-1.5 font-bold ${
                targetPrivacy === 'private' ? 'bg-[#a855f7] text-white' : 'bg-[#c9cd58] text-[#121414]'
              }`}>
                {targetPrivacy === 'private' ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                {targetPrivacy === 'private' ? t.folderPrivacyPrivate : t.folderPrivacyPublic}
              </span>
            </div>
          </div>

          {/* Conflict Alert Banner */}
          {hasConflict ? (
            <div className="p-3.5 rounded-lg bg-[#ef4444]/15 border border-[#ef4444]/40 flex items-start gap-3 text-[#fca5a5]">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-[#ef4444]" />
              <div className="space-y-1">
                <p className="font-bold text-xs">
                  {isFolder ? t.publicContainerConflictWarning : t.cannotAddPrivateFolderToPublicContainer}
                </p>
                <p className="text-[11px] text-[#fca5a5]/90 font-mono">
                  {t.containerPrivacyConstraintNote}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/30 flex items-start gap-2.5 text-[#93c5fd]">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#3b82f6]" />
              <p className="text-[11px] leading-relaxed">
                {targetPrivacy === 'public'
                  ? 'При переводе в публичный статус папка и её заметки станут доступны для добавления в публичные контейнеры и открытые представления.'
                  : t.privateContainerNotice}
              </p>
            </div>
          )}

          {/* Affected Obsidian Containers List */}
          {isFolder && folderImpact && folderImpact.affectedContainers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#93927e]">
                <span>{t.affectedContainers} ({folderImpact.affectedContainers.length})</span>
                <span>{t.affectedNotes}: {folderImpact.notesCount}</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {folderImpact.affectedContainers.map((c) => (
                  <div
                    key={c.id}
                    className={`p-2.5 rounded-md border flex items-center justify-between ${
                      c.isConflict
                        ? 'bg-[#ef4444]/10 border-[#ef4444]/40 text-[#fca5a5]'
                        : 'bg-[#141616] border-[#282a2a] text-[#c9c7b2]'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Layers className={`w-3.5 h-3.5 shrink-0 ${c.isConflict ? 'text-[#ef4444]' : 'text-[#c9cd58]'}`} />
                      <span className="font-medium text-xs truncate">{c.name}</span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded shrink-0 ${
                      c.privacy === 'public' ? 'bg-[#c9cd58]/20 text-[#e5e971]' : 'bg-[#a855f7]/20 text-[#d8b4fe]'
                    }`}>
                      {c.privacy === 'public' ? t.privacyPublic : t.privacyPrivate}
                      {c.isConflict && ' (Конфликт!)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Container Conflicting Folders List */}
          {!isFolder && containerImpact && containerImpact.conflictingFolders.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-mono text-[#93927e]">
                Приватные папки внутри контейнера ({containerImpact.conflictingFolders.length}):
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {containerImpact.conflictingFolders.map((f) => (
                  <div
                    key={f.id}
                    className="p-2.5 rounded-md bg-[#ef4444]/10 border border-[#ef4444]/40 flex items-center justify-between text-[#fca5a5]"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Lock className="w-3.5 h-3.5 shrink-0 text-[#ef4444]" />
                      <span className="font-mono text-xs truncate">{f.path}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#fca5a5]">
                      Приватная папка
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#242828] bg-[#141616] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded font-mono text-xs text-[#c9c7b2] hover:bg-[#242828] hover:text-white transition-colors"
          >
            {t.cancel}
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded font-mono text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
              hasConflict
                ? 'bg-[#ef4444] hover:bg-[#dc2626] text-white'
                : targetPrivacy === 'private'
                ? 'bg-[#a855f7] hover:bg-[#9333ea] text-white'
                : 'bg-[#c9cd58] hover:bg-[#d8db6f] text-[#121414]'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t.confirmPrivacyChange}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
