import React, { useState } from 'react';
import { useObsidianContainers, ContainerPrivacyImpact } from '../context/ObsidianContainersContext';
import { useFoldersContext } from '../context/FoldersContext';
import { useI18n } from '../i18n';
import { ObsidianLogo } from './ObsidianLogo';
import { SingleContainerDetailView } from './SingleContainerDetailView';
import { PrivacyChangeWarningModal } from './PrivacyChangeWarningModal';
import { Modal } from './Modal';
import { ContainerPrivacy, ContainerObserveMode, FolderPrivacy, CalendarFilterState } from '@lenta/shared';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Plus,
  Search,
  Lock,
  Globe,
  Folder,
  FolderPlus,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  ShieldCheck,
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Info,
  FolderGit2,
  AlertTriangle,
  Upload,
  Download,
  Filter,
  Zap,
} from 'lucide-react';
import dayjs from 'dayjs';

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
  onToggleContainer,
  onSelectOnlyContainer,
  onClearContainers,
  selectedSingleContainerId: propSelectedSingleContainerId,
  onSelectSingleContainer,
}) => {
  const { t } = useI18n();
  const {
    containers,
    selectedContainerIds,
    toggleSelectContainer,
    selectAllContainers,
    deselectAllContainers,
    selectedContainersCount,
    selectedContainersTotalNotes,
    isServerConnected,
    isServerLoading,
    refetchContainers,
    addContainer,
    updateContainer,
    deleteContainer,
    togglePrivacy,
    checkContainerPrivacyChangeImpact,
    addBoundFolder,
    removeBoundFolder,
    regenerateToken,
    triggerSync,
    pushContainer,
    pullContainer,
    isSyncingId,
    syncDirection,
    pendingChanges,
  } = useObsidianContainers();

  const { folders } = useFoldersContext();

  // Search & Filter
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

  const [initialDetailTab, setInitialDetailTab] = useState<'history' | 'folders' | 'preview' | 'settings'>('history');
  const [expandedAccordionId, setExpandedAccordionId] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [bindingFolderContainerId, setBindingFolderContainerId] = useState<string | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [warningContainerImpact, setWarningContainerImpact] = useState<ContainerPrivacyImpact | null>(null);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [bindingError, setBindingError] = useState<string>('');
  const [expandedPreviewContainerId, setExpandedPreviewContainerId] = useState<string | null>(null);





  // New Container Form State
  const [newForm, setNewForm] = useState<{
    name: string;
    description: string;
    vaultPath: string;
    privacy: ContainerPrivacy;
    folders: Array<{
      path: string;
      name: string;
      isPrimary: boolean;
      observeMode: ContainerObserveMode;
      filterTag?: string;
    }>;
  }>({
    name: '',
    description: '',
    vaultPath: '',
    privacy: 'private',
    folders: [
      {
        path: '01_Daily_Logs',
        name: 'Ежедневные заметки',
        isPrimary: true,
        observeMode: 'recursive',
      },
    ],
  });

  // Quick Folder Binding Input State
  const [quickFolderInput, setQuickFolderInput] = useState<{
    path: string;
    name: string;
    observeMode: ContainerObserveMode;
    filterTag: string;
  }>({
    path: '',
    name: '',
    observeMode: 'recursive',
    filterTag: '',
  });

  // Copy token helper
  const handleCopyToken = (containerId: string, token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedTokenId(containerId);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  // Filtered containers list
  const filteredContainers = containers.filter((c) => {
    const matchesPrivacy =
      privacyFilter === 'all' ? true : c.privacy === privacyFilter;
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q)) ||
      c.vaultPath.toLowerCase().includes(q) ||
      c.boundFolders.some((f) => f.path.toLowerCase().includes(q) || (f.name && f.name.toLowerCase().includes(q)));
    return matchesPrivacy && matchesSearch;
  });

  // Aggregated Stats
  const totalObservedFolders = containers.reduce(
    (sum, c) => sum + c.boundFolders.length,
    0
  );
  const totalSyncedNotes = containers.reduce((sum, c) => sum + c.notesCount, 0);
  const privateCount = containers.filter((c) => c.privacy === 'private').length;
  const publicCount = containers.filter((c) => c.privacy === 'public').length;

  // Add folder row in form
  const handleAddFolderRow = () => {
    setNewForm((prev) => ({
      ...prev,
      folders: [
        ...prev.folders,
        {
          path: '',
          name: '',
          isPrimary: false,
          observeMode: 'recursive',
        },
      ],
    }));
  };

  // Remove folder row in form
  const handleRemoveFolderRow = (index: number) => {
    setNewForm((prev) => {
      const nextFolders = prev.folders.filter((_, i) => i !== index);
      if (nextFolders.length > 0 && !nextFolders.some((f) => f.isPrimary)) {
        nextFolders[0].isPrimary = true;
      }
      return { ...prev, folders: nextFolders };
    });
  };

  // Handle create container submit
  const handleCreateContainerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name.trim()) return;

    const validFolders = newForm.folders
      .filter((f) => f.path.trim().length > 0)
      .map((f) => {
        const cleanPath = f.path.trim().replace(/^\/+|\/+$/g, '');
        const matchedFolder = folders.find(
          (m) => m.path.toLowerCase() === cleanPath.toLowerCase()
        );
        return {
          path: cleanPath,
          name: f.name.trim() || matchedFolder?.name || cleanPath.split('/').pop() || cleanPath,
          isPrimary: f.isPrimary,
          observeMode: f.observeMode,
          filterTag: f.filterTag?.trim() || undefined,
          notesCount: (matchedFolder as any)?._count?.noteFolders ?? 0,
        };
      });

    addContainer({
      name: newForm.name.trim(),
      description: newForm.description.trim() || undefined,
      vaultPath: newForm.vaultPath.trim() || `Vault/${newForm.name.trim().replace(/\s+/g, '_')}`,
      privacy: newForm.privacy,
      boundFolders: validFolders.length > 0 ? validFolders : undefined,
    });

    setIsAddModalOpen(false);
    setNewForm({
      name: '',
      description: '',
      vaultPath: '',
      privacy: 'private',
      folders: [
        {
          path: '01_Daily_Logs',
          name: 'Ежедневные заметки',
          isPrimary: true,
          observeMode: 'recursive',
        },
      ],
    });
  };

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

  // Quick Folder Bind Submit with validation
  const handleQuickFolderSubmit = (containerId: string) => {
    setBindingError('');
    const targetContainer = containers.find((c) => c.id === containerId);
    if (!targetContainer || !quickFolderInput.path.trim()) return;

    const cleanPath = quickFolderInput.path.trim().replace(/^\/+|\/+$/g, '');
    const matchedFolder = folders.find(
      (f) => f.path.toLowerCase() === cleanPath.toLowerCase()
    );
    const folderPrivacy: FolderPrivacy =
      matchedFolder?.privacy || (targetContainer.privacy === 'private' ? 'private' : 'public');

    const result = addBoundFolder(containerId, {
      path: cleanPath,
      name:
        quickFolderInput.name.trim() ||
        matchedFolder?.name ||
        cleanPath.split('/').pop() ||
        cleanPath,
      observeMode: quickFolderInput.observeMode,
      filterTag: quickFolderInput.filterTag.trim() || undefined,
      privacy: folderPrivacy,
      notesCount: (matchedFolder as any)?._count?.noteFolders ?? 0,
    });

    if (!result.success) {
      setBindingError(result.error || t.cannotAddPrivateFolderToPublicContainer);
      return;
    }

    setBindingFolderContainerId(null);
    setBindingError('');
    setQuickFolderInput({
      path: '',
      name: '',
      observeMode: 'recursive',
      filterTag: '',
    });
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
                ? 'Connected to obsidian-containers backend service (port 3000)'
                : 'Backend container server offline on port 3000 (running in local storage fallback mode)'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isServerConnected ? 'bg-[#34d399] animate-pulse' : 'bg-[#fbbf24]'
              }`}
            />
            <span>{isServerConnected ? 'Server Connected (:3000)' : 'Local Fallback'}</span>
          </div>

          <button
            onClick={() => refetchContainers()}
            disabled={isServerLoading}
            className="p-2 rounded-lg bg-[#1e2020] border border-[#242828] hover:border-[#a855f7]/60 text-[#c9c7b2] hover:text-[#d8b4fe] text-xs font-mono transition-all disabled:opacity-50"
            title="Refetch containers from backend"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isServerLoading ? 'animate-spin text-[#a855f7]' : ''}`} />
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
        {/* Stat 1: Total Containers Count */}
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

        {/* Stat 2: Privacy Ratio */}
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

        {/* Stat 3: Total Observed Folders */}
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

        {/* Stat 4: Synced Notes Count */}
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
        {/* Left: Search input */}
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

        {/* Right: Privacy filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">

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
          {filteredContainers.map((container) => {
            const isPrivate = container.privacy === 'private';
            const isSyncing = isSyncingId === container.id;
            const isCopied = copiedTokenId === container.id;
            const pending = pendingChanges[container.id] ?? 0;

            const isSelected = filterState?.containers
              ? filterState.containers.includes(container.id)
              : selectedContainerIds.includes(container.id);

            const isExpanded = expandedAccordionId === container.id;

            return (
              <div
                key={container.id}
                onClick={() => setExpandedAccordionId(isExpanded ? null : container.id)}
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
                          <span>{container.name}</span>
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
                            handleContainerPrivacyToggle(container.id);
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
                        {pending > 0 && !isSyncing && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#c9cd58]/20 text-[#e5e971] border border-[#c9cd58]/40 shrink-0">
                            {pending} local change{pending > 1 ? 's' : ''}
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
                        pushContainer(container.id);
                      }}
                      disabled={isSyncing}
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
                        pullContainer(container.id);
                      }}
                      disabled={isSyncing}
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
                        handleCopyToken(container.id, container.token);
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

                    {/* Primary Details CTA Button (Redirects to Container Page) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSingleContainerId(container.id);
                        setInitialDetailTab('history');
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
                    {/* 1. Unpushed Local Changes Section */}
                    <div className="p-3 rounded-lg bg-[#121414] border border-[#242828] space-y-2">
                      <div className="flex items-center justify-between font-mono text-[11px] font-bold text-[#e5e971]">
                        <span className="flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-[#c9cd58]" />
                          <span>Локальные несинхронизированные изменения (Unpushed)</span>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#c9cd58]/15 text-[#e5e971] border border-[#c9cd58]/30 text-[10px]">
                          {pending > 0 ? `${pending} файла в очереди` : 'Все изменения запушены'}
                        </span>
                      </div>

                      {pending > 0 ? (
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

                    {/* 2. Compact Note ChangeLog Stream */}
                    <div className="p-3 rounded-lg bg-[#121414] border border-[#242828] space-y-2">
                      <div className="flex items-center justify-between font-mono text-[11px] font-bold text-[#c9c7b2]">
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[#3b82f6]" />
                          <span>Лента изменений (Last Changes)</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSingleContainerId(container.id);
                            setInitialDetailTab('history');
                          }}
                          className="text-[10px] text-[#a855f7] hover:text-[#d8b4fe] hover:underline font-semibold flex items-center gap-1"
                        >
                          <span>Полная история (Time Machine)</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        <div className="p-2 rounded bg-[#0f1111] border border-[#242828] flex items-center justify-between text-[11px] font-mono">
                          <span className="flex items-center gap-2 text-[#22c55e]">
                            <span className="font-bold">+</span>
                            <span className="text-[#e2e2e2]">Добавлено Note Новости Мира, ООН.</span>
                          </span>
                          <span className="text-[#93927e] text-[10px]">25.08.26</span>
                        </div>

                        <div className="p-2 rounded bg-[#0f1111] border border-[#242828] flex items-center justify-between text-[11px] font-mono">
                          <span className="flex items-center gap-2 text-[#22c55e]">
                            <span className="font-bold">+</span>
                            <span className="text-[#e2e2e2]">Добавлено Note Новости Мира, Выборы в Конгресс США.</span>
                          </span>
                          <span className="text-[#93927e] text-[10px]">25.08.26</span>
                        </div>

                        <div className="p-2 rounded bg-[#0f1111] border border-[#242828] flex items-center justify-between text-[11px] font-mono">
                          <span className="flex items-center gap-2 text-[#e5e971]">
                            <span className="font-bold">~</span>
                            <span className="text-[#e2e2e2]">Обновлена заметка План релизов v2.1</span>
                          </span>
                          <span className="text-[#93927e] text-[10px]">24.08.26</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}


      {/* 5. Modal: Add New Obsidian Container */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        maxWidth="max-w-2xl"
        containerClassName="border-[#a855f7]/40 rounded-2xl"
        title={t.newContainerTitle}
        subtitle="Создание хранилища с выбором приватности и отслеживаемых папок"
        icon={
          <div className="w-8 h-8 rounded-lg bg-[#a855f7]/20 border border-[#a855f7]/50 flex items-center justify-center">
            <ObsidianLogo size={20} />
          </div>
        }
      >
        <form onSubmit={handleCreateContainerSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto">
          {/* Container Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono font-semibold text-[#c9c7b2] flex items-center gap-1.5">
              <span>{t.containerName} *</span>
            </label>
            <input
              type="text"
              required
              placeholder="например: Work Roadmap или Личный Дневник"
              value={newForm.name}
              onChange={(e) => setNewForm((prev) => ({ ...prev, name: e.target.value }))}
              className="bg-[#121414] border border-[#242828] focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] rounded-lg text-xs font-mono px-3.5 py-2 text-[#e2e2e2] outline-none transition-all"
            />
          </div>

          {/* Vault Root Path & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-semibold text-[#c9c7b2]">
                {t.vaultPath}
              </label>
              <input
                type="text"
                placeholder="например: Vault/Projects"
                value={newForm.vaultPath}
                onChange={(e) => setNewForm((prev) => ({ ...prev, vaultPath: e.target.value }))}
                className="bg-[#121414] border border-[#242828] focus:border-[#a855f7] rounded-lg text-xs font-mono px-3.5 py-2 text-[#e2e2e2] outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-semibold text-[#c9c7b2]">
                Описание (опционально)
              </label>
              <input
                type="text"
                placeholder="Краткое назначение контейнера..."
                value={newForm.description}
                onChange={(e) => setNewForm((prev) => ({ ...prev, description: e.target.value }))}
                className="bg-[#121414] border border-[#242828] focus:border-[#a855f7] rounded-lg text-xs font-mono px-3.5 py-2 text-[#e2e2e2] outline-none"
              />
            </div>
          </div>

          {/* Privacy Choice (Private vs Public) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono font-semibold text-[#c9c7b2] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#a855f7]" />
              <span>{t.privacySetting}</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Private */}
              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  newForm.privacy === 'private'
                    ? 'bg-[#a855f7]/15 border-[#a855f7] ring-1 ring-[#a855f7]/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                    : 'bg-[#121414] border-[#242828] hover:border-[#383a3a]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#a855f7]" />
                    <span className="font-sans font-bold text-xs text-[#f3e8ff]">
                      {t.privacyPrivate}
                    </span>
                  </div>
                  <input
                    type="radio"
                    name="privacy"
                    value="private"
                    checked={newForm.privacy === 'private'}
                    onChange={() => setNewForm((prev) => ({ ...prev, privacy: 'private' }))}
                    className="text-[#a855f7] focus:ring-[#a855f7]"
                  />
                </div>
                <p className="text-[11px] text-[#93927e] leading-snug">
                  {t.privacyPrivateDesc}
                </p>
              </label>

              {/* Option 2: Public */}
              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  newForm.privacy === 'public'
                    ? 'bg-[#c9cd58]/15 border-[#c9cd58] ring-1 ring-[#c9cd58]/40 shadow-[0_0_15px_rgba(201,205,88,0.2)]'
                    : 'bg-[#121414] border-[#242828] hover:border-[#383a3a]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#c9cd58]" />
                    <span className="font-sans font-bold text-xs text-[#e5e971]">
                      {t.privacyPublic}
                    </span>
                  </div>
                  <input
                    type="radio"
                    name="privacy"
                    value="public"
                    checked={newForm.privacy === 'public'}
                    onChange={() => setNewForm((prev) => ({ ...prev, privacy: 'public' }))}
                    className="text-[#c9cd58] focus:ring-[#c9cd58]"
                  />
                </div>
                <p className="text-[11px] text-[#93927e] leading-snug">
                  {t.privacyPublicDesc}
                </p>
              </label>
            </div>
          </div>

          {/* Bound Folders to Observe */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-mono font-semibold text-[#c9c7b2] flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5 text-[#a855f7]" />
                  <span>{t.boundFoldersTitle}</span>
                </label>
                <p className="text-[11px] text-[#93927e]">
                  {t.boundFoldersDesc}
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddFolderRow}
                className="text-xs font-mono text-[#a855f7] hover:text-[#d8b4fe] flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить еще папку</span>
              </button>
            </div>

            {/* Folder Rows */}
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto p-1">
              {newForm.folders.map((folder, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-[#121414] border border-[#242828] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      placeholder="Путь: 01_Daily_Logs или Notes/Dev"
                      value={folder.path}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewForm((prev) => ({
                          ...prev,
                          folders: prev.folders.map((f, i) =>
                            i === index ? { ...f, path: val } : f
                          ),
                        }));
                      }}
                      className="w-full bg-[#181a1a] border border-[#242828] rounded text-xs font-mono px-2.5 py-1.5 text-[#e2e2e2] outline-none focus:border-[#a855f7]"
                    />
                  </div>

                  <div className="w-full sm:w-48">
                    <select
                      value={folder.observeMode}
                      onChange={(e) => {
                        const val = e.target.value as ContainerObserveMode;
                        setNewForm((prev) => ({
                          ...prev,
                          folders: prev.folders.map((f, i) =>
                            i === index ? { ...f, observeMode: val } : f
                          ),
                        }));
                      }}
                      className="w-full bg-[#181a1a] border border-[#242828] rounded text-xs font-mono px-2.5 py-1.5 text-[#e2e2e2] outline-none"
                    >
                      <option value="recursive">Рекурсивно (все подпапки)</option>
                      <option value="all">Только прямые файлы</option>
                      <option value="filtered">Фильтрация по тегу</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 justify-between sm:justify-end">
                    <label className="flex items-center gap-1.5 text-[11px] font-mono text-[#93927e] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={folder.isPrimary}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setNewForm((prev) => ({
                            ...prev,
                            folders: prev.folders.map((f, i) => ({
                              ...f,
                              isPrimary: i === index ? checked : checked ? false : f.isPrimary,
                            })),
                          }));
                        }}
                        className="rounded text-[#a855f7]"
                      />
                      <span>Главная</span>
                    </label>

                    {newForm.folders.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFolderRow(index)}
                        className="p-1 rounded text-[#555] hover:text-[#f87171] hover:bg-[#242828]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-[#242828] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-[#242828] hover:bg-[#333535] text-xs font-mono text-[#e2e2e2] transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#a855f7] to-[#8b5cf6] hover:from-[#b76eff] hover:to-[#9d6efc] text-white font-sans font-semibold text-xs shadow-lg transition-all"
            >
              {t.addContainer}
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. Modal: Plugin Companion Setup Guide */}
      <Modal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        maxWidth="max-w-2xl"
        containerClassName="rounded-2xl"
        title={t.pluginInstructionsTitle}
        subtitle="Lemon Lenta Plugin • Двусторонняя синхронизация Markdown"
        icon={
          <div className="w-8 h-8 rounded-lg bg-[#a855f7]/20 border border-[#a855f7]/50 flex items-center justify-center">
            <ObsidianLogo size={20} />
          </div>
        }
      >
        {/* Body Guide */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto text-xs text-[#c9c7b2] leading-relaxed">
          <div className="p-4 rounded-xl bg-[#121414] border border-[#242828] flex flex-col gap-2">
            <h4 className="font-bold text-[#e5e971] flex items-center gap-2">
              <span>1. Установка плагина в Obsidian</span>
            </h4>
            <p className="text-[#93927e] text-[11px]">
              Плагин находится в пакете <code className="text-[#d8b4fe] bg-[#1e2020] px-1.5 py-0.5 rounded">packages/obsidian-plugin</code>. Скопируйте файлы <code className="text-[#d8b4fe]">main.js</code> и <code className="text-[#d8b4fe]">manifest.json</code> в папку <code className="text-[#d8b4fe]">.obsidian/plugins/lemon-lenta-sync</code> вашего хранилища.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#121414] border border-[#242828] flex flex-col gap-2">
            <h4 className="font-bold text-[#e5e971] flex items-center gap-2">
              <span>2. Настройка подключения и API-токена</span>
            </h4>
            <p className="text-[#93927e] text-[11px]">
              Откройте <strong>Настройки Obsidian → Lemon Lenta Plugin</strong>:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-[#93927e] text-[11px]">
              <li>Укажите <strong>Server URL</strong>: <code className="text-[#c9cd58]">http://localhost:3001</code></li>
              <li>Вставьте ваш <strong>API Токен контейнера</strong> из списка выше.</li>
              <li>Нажмите <strong>Sign In & Validate</strong> для подтверждения подключения.</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-[#121414] border border-[#242828] flex flex-col gap-2">
            <h4 className="font-bold text-[#e5e971] flex items-center gap-2">
              <span>3. Наблюдение за папками (Observed Folders)</span>
            </h4>
            <p className="text-[#93927e] text-[11px]">
              Все заметки с YAML frontmatter в отслеживаемых папках будут автоматически парситься, версионироваться и отображаться в едином календаре Lemon Calendarium.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#242828] bg-[#141616] flex justify-end">
          <button
            onClick={() => setIsGuideModalOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-[#242828] hover:bg-[#333] text-xs font-mono text-[#e2e2e2]"
          >
            {t.close}
          </button>
        </div>
      </Modal>

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

