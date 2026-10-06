import React, { useState } from 'react';
import {
  useObsidianContainers,
  ContainerPrivacyImpact,
} from '../context/ObsidianContainersContext';
import { useFoldersContext } from '../context/FoldersContext';
import { useI18n } from '../i18n';
import { ObsidianLogo } from './ObsidianLogo';
import { SingleContainerDetailView } from './SingleContainerDetailView';
import { PrivacyChangeWarningModal } from './PrivacyChangeWarningModal';
import { ContainerChangeLogStream } from './ContainerChangeLogStream';
import { ContainerCardItem } from './ContainerCardItem';
import { AddContainerModal } from './AddContainerModal';
import { ObsidianGuideModal } from './ObsidianGuideModal';
import { CalendarFilterState } from '@lenta/shared';
import {
  filterContainers,
  computeContainerStats,
} from '../utils/obsidianContainers.utils';
import {
  Plus,
  Search,
  Lock,
  Globe,
  RefreshCw,
  ShieldCheck,
  FileText,
  Info,
  FolderGit2,
} from 'lucide-react';

export { ContainerChangeLogStream };

interface ObsidianContainersViewProps {
  filterState?: CalendarFilterState;
  onToggleContainer?: (containerId: string) => void;
  onSelectOnlyContainer?: (containerId: string) => void;
  onClearContainers?: () => void;
  selectedSingleContainerId?: string | null;
  onSelectSingleContainer?: (containerId: string | null) => void;
}

export const ObsidianContainersView: React.FC<ObsidianContainersViewProps> = ({
  filterState,
  selectedSingleContainerId: propSelectedSingleContainerId,
  onSelectSingleContainer,
}) => {
  const { t } = useI18n();
  const {
    containers,
    isServerConnected,
    isServerLoading,
    refetchContainers,
    addContainer,
    togglePrivacy,
    checkContainerPrivacyChangeImpact,
    isSyncingId,
    syncDirection,
    pendingChanges,
    openSyncModal,
  } = useObsidianContainers();

  const { folders } = useFoldersContext();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'private' | 'public'>('all');

  // Single Container Details Workspace Navigation State
  const [internalSelectedSingleContainerId, setInternalSelectedSingleContainerId] = useState<string | null>(null);
  const selectedSingleContainerId =
    propSelectedSingleContainerId !== undefined
      ? propSelectedSingleContainerId
      : internalSelectedSingleContainerId;

  const setSelectedSingleContainerId = (id: string | null) => {
    setInternalSelectedSingleContainerId(id);
    if (onSelectSingleContainer) {
      onSelectSingleContainer(id);
    }
  };

  const [initialDetailTab, setInitialDetailTab] = useState<
    'files' | 'history' | 'folders' | 'settings'
  >('files');
  const [expandedAccordionId, setExpandedAccordionId] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [warningContainerImpact, setWarningContainerImpact] = useState<ContainerPrivacyImpact | null>(null);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);

  // Copy token helper
  const handleCopyToken = (containerId: string, token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedTokenId(containerId);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  // Filtered containers list using extracted utility
  const filteredContainers = filterContainers(containers, {
    privacy: privacyFilter,
    searchTerm,
  });

  // Aggregated Stats using extracted utility
  const { totalObservedFolders, totalSyncedNotes, privateCount, publicCount } =
    computeContainerStats(containers);

  // Handle Privacy Toggle on Container with impact warning
  const handleContainerPrivacyToggle = (containerId: string) => {
    const impact = checkContainerPrivacyChangeImpact(containerId);
    if (impact.hasConflict) {
      setWarningContainerImpact(impact);
      setIsWarningModalOpen(true);
    } else {
      togglePrivacy(containerId, true);
    }
  };

  const handleConfirmContainerPrivacyChange = () => {
    if (warningContainerImpact) {
      togglePrivacy(warningContainerImpact.containerId, true);
      setWarningContainerImpact(null);
    }
  };

  // If a specific single container is selected for detailed work, render the dedicated workspace view
  if (selectedSingleContainerId) {
    return (
      <SingleContainerDetailView
        containerId={selectedSingleContainerId}
        onBack={() => setSelectedSingleContainerId(null)}
        initialTab={initialDetailTab}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#121414] text-[#e2e2e2] px-4 lg:px-8 py-6 selection:bg-[#8b5cf6]/30 selection:text-[#d8b4fe]">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#242828]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8b5cf6]/30 via-[#6b21a8]/20 to-[#1e142e] border border-[#a855f7]/50 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.25)]">
            <ObsidianLogo size={28} glow />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-sans font-bold text-lg md:text-xl text-[#f3e8ff] tracking-tight">
                {t.obsidianHub}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#a855f7]/15 text-[#d8b4fe] border border-[#a855f7]/30">
                2-Way Vault Sync
              </span>
            </div>
            <p className="text-xs text-[#93927e] mt-0.5 max-w-xl">
              {t.obsidianConnectionSubtitle}
            </p>
          </div>
        </div>

        {/* Action Buttons & Backend Connectivity Badge */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
              isServerConnected
                ? 'bg-[#10b981]/10 text-[#34d399] border-[#10b981]/30'
                : 'bg-[#f59e0b]/10 text-[#fbbf24] border-[#f59e0b]/30'
            }`}
            title={
              isServerConnected
                ? 'Connected to central backend container service (port 3001)'
                : 'Backend container server offline on port 3001 (running in local storage fallback mode)'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isServerConnected ? 'bg-[#34d399] animate-pulse' : 'bg-[#fbbf24]'
              }`}
            />
            <span>{isServerConnected ? 'Server Connected (:3001)' : 'Local Fallback'}</span>
          </div>

          <button
            onClick={() => refetchContainers()}
            disabled={isServerLoading}
            className="p-2 rounded-lg bg-[#1e2020] border border-[#242828] hover:border-[#a855f7]/60 text-[#c9c7b2] hover:text-[#d8b4fe] text-xs font-mono transition-all disabled:opacity-50"
            title="Refetch containers from backend"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isServerLoading ? 'animate-spin text-[#a855f7]' : ''}`}
            />
          </button>

          <button
            onClick={() => setIsGuideModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1e2020] border border-[#242828] hover:border-[#a855f7]/60 text-[#c9c7b2] hover:text-[#d8b4fe] text-xs font-mono transition-all"
          >
            <Info className="w-3.5 h-3.5 text-[#a855f7]" />
            <span>{t.pluginInstructionsTitle}</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#a855f7] to-[#8b5cf6] hover:from-[#b76eff] hover:to-[#9d6efc] text-white font-sans font-semibold text-xs shadow-[0_0_15px_rgba(168,85,247,0.35)] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addContainer}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Stats Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3.5 rounded-xl bg-[#181a1a] border border-[#242828] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-[#93927e] uppercase tracking-wider block">
              Всего Контейнеров
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xl font-sans font-bold text-[#c9cd58]">
                {containers.length}
              </span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#a855f7]/15 border border-[#a855f7]/30 flex items-center justify-center text-[#d8b4fe]">
            <ObsidianLogo size={16} />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#181a1a] border border-[#242828] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-[#93927e] uppercase tracking-wider block">
              Приватные / Публичные
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-sans font-bold text-[#a855f7] flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> {privateCount}
              </span>
              <span className="text-xs text-[#555]">•</span>
              <span className="text-sm font-sans font-bold text-[#c9cd58] flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> {publicCount}
              </span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#1e2020] border border-[#333] flex items-center justify-center text-[#93927e]">
            <ShieldCheck className="w-4 h-4 text-[#c9cd58]" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#181a1a] border border-[#242828] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-[#93927e] uppercase tracking-wider block">
              {t.observedFoldersCount}
            </span>
            <span className="text-xl font-sans font-bold text-[#c9cd58]">
              {totalObservedFolders}
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#c9cd58]/15 border border-[#c9cd58]/30 flex items-center justify-center text-[#c9cd58]">
            <FolderGit2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#181a1a] border border-[#242828] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-[#93927e] uppercase tracking-wider block">
              {t.syncedNotesCount}
            </span>
            <span className="text-xl font-sans font-bold text-[#e2e2e2]">
              {totalSyncedNotes}
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6]">
            <FileText className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. Toolbar & Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 bg-[#181a1a] p-2.5 rounded-xl border border-[#242828]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#93927e]" />
          <input
            type="text"
            placeholder={t.searchContainers}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#121414] border border-[#242828] focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] rounded-lg text-xs font-mono pl-8 pr-3 py-1.5 text-[#e2e2e2] placeholder-[#93927e] outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#121414] p-1 rounded-lg border border-[#242828]">
          <button
            onClick={() => setPrivacyFilter('all')}
            className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
              privacyFilter === 'all'
                ? 'bg-[#242828] text-[#e2e2e2] font-semibold'
                : 'text-[#93927e] hover:text-white'
            }`}
          >
            {t.filterAll} ({containers.length})
          </button>
          <button
            onClick={() => setPrivacyFilter('private')}
            className={`px-3 py-1 rounded-md text-xs font-mono flex items-center gap-1.5 transition-colors ${
              privacyFilter === 'private'
                ? 'bg-[#a855f7]/20 text-[#d8b4fe] border border-[#a855f7]/40 font-semibold'
                : 'text-[#93927e] hover:text-white'
            }`}
          >
            <Lock className="w-3 h-3 text-[#a855f7]" />
            <span>{t.filterPrivate} ({privateCount})</span>
          </button>
          <button
            onClick={() => setPrivacyFilter('public')}
            className={`px-3 py-1 rounded-md text-xs font-mono flex items-center gap-1.5 transition-colors ${
              privacyFilter === 'public'
                ? 'bg-[#c9cd58]/20 text-[#e5e971] border border-[#c9cd58]/40 font-semibold'
                : 'text-[#93927e] hover:text-white'
            }`}
          >
            <Globe className="w-3 h-3 text-[#c9cd58]" />
            <span>{t.filterPublic} ({publicCount})</span>
          </button>
        </div>
      </div>

      {/* 4. Container Cards Grid */}
      {filteredContainers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[#181a1a] border border-[#242828] rounded-2xl text-center">
          <div className="w-12 h-12 rounded-xl bg-[#a855f7]/10 border border-[#a855f7]/30 flex items-center justify-center mb-3">
            <ObsidianLogo size={24} />
          </div>
          <h3 className="font-sans font-bold text-sm text-[#e2e2e2] mb-1">
            {t.noContainersFound}
          </h3>
          <p className="text-xs text-[#93927e] max-w-sm mb-4">
            Попробуйте изменить поисковый запрос или создайте новый контейнер Obsidian для синхронизации.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-[#a855f7] hover:bg-[#b76eff] text-white font-sans text-xs font-semibold flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.addContainer}</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col space-y-3 pb-8">
          {filteredContainers.map((container) => (
            <ContainerCardItem
              key={container.id}
              container={container}
              isExpanded={expandedAccordionId === container.id}
              onToggleExpand={() =>
                setExpandedAccordionId(
                  expandedAccordionId === container.id ? null : container.id,
                )
              }
              onPrivacyToggle={() => handleContainerPrivacyToggle(container.id)}
              onCopyToken={(token) => handleCopyToken(container.id, token)}
              isCopied={copiedTokenId === container.id}
              isSyncing={isSyncingId === container.id}
              syncDirection={isSyncingId === container.id ? syncDirection : null}
              pendingChangesCount={pendingChanges[container.id] ?? 0}
              onOpenSyncModal={openSyncModal}
              onOpenDetails={(id) => {
                setSelectedSingleContainerId(id);
                setInitialDetailTab('history');
              }}
            />
          ))}
        </div>
      )}

      {/* 5. Modal: Add New Obsidian Container */}
      <AddContainerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        folders={folders}
        onAddContainer={addContainer}
      />

      {/* 6. Modal: Plugin Companion Setup Guide */}
      <ObsidianGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

      {/* 7. Privacy Change Warning Modal */}
      <PrivacyChangeWarningModal
        isOpen={isWarningModalOpen}
        onClose={() => {
          setIsWarningModalOpen(false);
          setWarningContainerImpact(null);
        }}
        containerImpact={warningContainerImpact}
        onConfirm={handleConfirmContainerPrivacyChange}
      />
    </div>
  );
};
