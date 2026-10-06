import React from 'react';
import { ObsidianContainer, getContainerDisplayTitle } from '@lenta/shared';
import { ObsidianLogo } from './ObsidianLogo';
import { ContainerChangeLogStream } from './ContainerChangeLogStream';
import dayjs from 'dayjs';
import {
  Lock,
  Globe,
  Folder,
  FolderGit2,
  FileText,
  Upload,
  Download,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface ContainerCardItemProps {
  container: ObsidianContainer;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPrivacyToggle: () => void;
  onCopyToken: (token: string) => void;
  isCopied: boolean;
  isSyncing: boolean;
  syncDirection: 'push' | 'pull' | null;
  pendingChangesCount: number;
  onOpenSyncModal: (opts: { mode: 'push' | 'pull'; containerId: string }) => void;
  onOpenDetails: (containerId: string) => void;
}

export const ContainerCardItem: React.FC<ContainerCardItemProps> = ({
  container,
  isExpanded,
  onToggleExpand,
  onPrivacyToggle,
  onCopyToken,
  isCopied,
  isSyncing,
  syncDirection,
  pendingChangesCount,
  onOpenSyncModal,
  onOpenDetails,
}) => {
  const isPrivate = container.privacy === 'private';

  return (
    <div
      onClick={onToggleExpand}
      className={`p-4 rounded-xl bg-[#181a1a] hover:bg-[#1e2020] border transition-all duration-200 flex flex-col justify-between gap-3 group cursor-pointer ${
        isPrivate
          ? 'border-[#a855f7]/30 hover:border-[#a855f7]/70'
          : 'border-[#c9cd58]/30 hover:border-[#c9cd58]/70'
      }`}
    >
      {/* Main List Item Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Avatar + Details */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="relative shrink-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-lg border transition-transform group-hover:scale-105"
              style={{
                backgroundColor: isPrivate ? 'rgba(168,85,247,0.15)' : 'rgba(201,205,88,0.15)',
                borderColor: isPrivate ? 'rgba(168,85,247,0.4)' : 'rgba(201,205,88,0.4)',
              }}
            >
              <ObsidianLogo size={22} />
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-sans font-bold text-sm text-[#f3e8ff] group-hover:text-white transition-colors truncate flex items-center gap-1.5">
                <span>{getContainerDisplayTitle(container)}</span>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-[#a855f7]" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-[#93927e] group-hover:text-white transition-colors" />
                )}
              </h3>

              {/* Privacy Pill */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrivacyToggle();
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border shrink-0 transition-colors ${
                  isPrivate
                    ? 'bg-[#a855f7]/15 border-[#a855f7]/40 text-[#d8b4fe] hover:bg-[#a855f7]/30'
                    : 'bg-[#c9cd58]/15 border-[#c9cd58]/40 text-[#e5e971] hover:bg-[#c9cd58]/30'
                }`}
              >
                {isPrivate ? <Lock className="w-3 h-3 text-[#a855f7]" /> : <Globe className="w-3 h-3 text-[#c9cd58]" />}
                <span>{isPrivate ? 'Private' : 'Public'}</span>
              </button>

              {/* Pending Changes Indicator */}
              {pendingChangesCount > 0 && !isSyncing && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#c9cd58]/20 text-[#e5e971] border border-[#c9cd58]/40 shrink-0">
                  {pendingChangesCount} local change{pendingChangesCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Sub-line: Vault Path & Metadata Chips */}
            <div className="flex items-center gap-3 text-[11px] font-mono text-[#93927e] flex-wrap">
              <span className="flex items-center gap-1 truncate text-[#c9c7b2]">
                <Folder className="w-3 h-3 text-[#a855f7]" />
                <span>{container.vaultPath}</span>
              </span>

              <span>•</span>

              <span className="flex items-center gap-1 text-[#c9c7b2]">
                <FolderGit2 className="w-3 h-3 text-[#c9cd58]" />
                <span>{container.boundFolders.length} папки</span>
              </span>

              <span>•</span>

              <span className="flex items-center gap-1 text-[#c9c7b2]">
                <FileText className="w-3.5 h-3.5 text-[#3b82f6]" />
                <span>{container.notesCount || 0} заметок</span>
              </span>

              {container.lastSyncedAt && (
                <>
                  <span>•</span>
                  <span className="text-[#93927e]">
                    Синхр: {dayjs(container.lastSyncedAt).format('HH:mm, DD.MM')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Quick Action Toolbar + Details Button */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          {/* Quick Sync / Push */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSyncModal({ mode: 'push', containerId: container.id });
            }}
            title="Push local changes"
            className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              isSyncing && syncDirection === 'push'
                ? 'bg-[#c9cd58]/25 text-[#e5e971] border-[#c9cd58]/40'
                : 'bg-[#121414] hover:bg-[#c9cd58]/15 border-[#242828] hover:border-[#c9cd58]/60 text-[#e2e2e2] hover:text-[#e5e971]'
            }`}
          >
            <Upload className={`w-3.5 h-3.5 ${isSyncing && syncDirection === 'push' ? 'animate-bounce text-[#e5e971]' : ''}`} />
            <span>Push</span>
          </button>

          {/* Quick Pull */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSyncModal({ mode: 'pull', containerId: container.id });
            }}
            title="Pull latest notes"
            className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              isSyncing && syncDirection === 'pull'
                ? 'bg-[#a855f7]/25 text-[#d8b4fe] border-[#a855f7]/40'
                : 'bg-[#121414] hover:bg-[#a855f7]/15 border-[#242828] hover:border-[#a855f7]/60 text-[#e2e2e2] hover:text-[#d8b4fe]'
            }`}
          >
            <Download className={`w-3.5 h-3.5 ${isSyncing && syncDirection === 'pull' ? 'animate-bounce text-[#d8b4fe]' : ''}`} />
            <span>Pull</span>
          </button>

          {/* Copy Token Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCopyToken(container.token);
            }}
            title="Скопировать токен контейнера"
            className={`p-1.5 rounded-lg border transition-all ${
              isCopied
                ? 'bg-[#22c55e] text-white border-[#22c55e]'
                : 'bg-[#121414] text-[#93927e] border-[#242828] hover:text-white hover:border-[#a855f7]'
            }`}
          >
            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Primary Details CTA Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(container.id);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-[#a855f7]/15 hover:bg-[#a855f7] text-[#d8b4fe] hover:text-white border border-[#a855f7]/40 font-mono font-bold text-xs transition-all flex items-center gap-1.5 group/btn shadow-[0_0_12px_rgba(168,85,247,0.15)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] ml-1"
          >
            <span>Детали</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Expanded Accordion Content Zone */}
      {isExpanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-2 pt-3 border-t border-[#242828] space-y-3 animate-in fade-in duration-150 text-xs cursor-default"
        >
          {/* Unpushed Local Changes Section */}
          <div className="p-3 rounded-lg bg-[#121414] border border-[#242828] space-y-2">
            <div className="flex items-center justify-between font-mono text-[11px] font-bold text-[#e5e971]">
              <span className="flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-[#c9cd58]" />
                <span>Локальные несинхронизированные изменения (Unpushed)</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-[#c9cd58]/15 text-[#e5e971] border border-[#c9cd58]/30 text-[10px]">
                {pendingChangesCount > 0
                  ? `${pendingChangesCount} файла в очереди`
                  : 'Все изменения запушены'}
              </span>
            </div>

            {pendingChangesCount > 0 ? (
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex items-center justify-between text-[#d8b4fe] bg-[#1a1726] p-2 rounded border border-[#a855f7]/30">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-pulse" />
                    <span>● Изменено: Note Q4 Content Strategy Review.md</span>
                  </span>
                  <span className="text-[10px] text-[#93927e]">не запушено</span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] font-mono text-[#93927e]">
                ✓ Нет локальных изменений, ожидающих отправки на сервер.
              </p>
            )}
          </div>

          {/* Compact Note ChangeLog Stream */}
          <ContainerChangeLogStream
            container={container}
            onOpenHistory={() => onOpenDetails(container.id)}
          />
        </div>
      )}
    </div>
  );
};
