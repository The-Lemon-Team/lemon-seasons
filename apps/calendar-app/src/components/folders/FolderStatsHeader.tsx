import React from 'react';
import { FolderTree, Globe, Lock, Plus } from 'lucide-react';
import { useI18n } from '../../i18n';

export interface FolderStatsHeaderProps {
  totalFoldersCount: number;
  publicFoldersCount: number;
  privateFoldersCount: number;
  onCreateFolder: () => void;
}

export const FolderStatsHeader: React.FC<FolderStatsHeaderProps> = ({
  totalFoldersCount,
  publicFoldersCount,
  privateFoldersCount,
  onCreateFolder,
}) => {
  const { t } = useI18n();

  return (
    <header className="px-6 py-4 border-b border-[#242828] bg-[#181a1a] flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c9cd58]/30 to-[#535600]/20 border border-[#c9cd58]/50 flex items-center justify-center text-xl shadow-glow-lemon">
          📁
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-sans font-bold text-base text-[#e2e2e2] tracking-wide">
              {t.folderManager}
            </h1>
          </div>
          <p className="text-xs font-mono text-[#93927e]">
            {t.folderManagerSubtitle}
          </p>
        </div>
      </div>

      {/* Header Stats Bar */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
        <div className="px-3 py-1.5 rounded-lg bg-[#141616] border border-[#2d3030] flex items-center gap-2">
          <FolderTree className="w-3.5 h-3.5 text-[#c9cd58]" />
          <div className="text-[11px] font-mono">
            <span className="text-[#93927e]">Всего: </span>
            <span className="font-bold text-[#e2e2e2]">{totalFoldersCount}</span>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-lg bg-[#141616] border border-[#2d3030] flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-[#c9cd58]" />
          <div className="text-[11px] font-mono">
            <span className="text-[#93927e]">Публичные: </span>
            <span className="font-bold text-[#e5e971]">{publicFoldersCount}</span>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-lg bg-[#141616] border border-[#2d3030] flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-[#a855f7]" />
          <div className="text-[11px] font-mono">
            <span className="text-[#93927e]">Приватные: </span>
            <span className="font-bold text-[#d8b4fe]">{privateFoldersCount}</span>
          </div>
        </div>

        {/* New Folder Button */}
        <button
          type="button"
          onClick={onCreateFolder}
          className="px-3.5 py-1.5 rounded-lg bg-[#c9cd58] hover:bg-[#d8db6f] text-[#121414] font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-glow-lemon shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.createFolder}</span>
        </button>
      </div>
    </header>
  );
};
