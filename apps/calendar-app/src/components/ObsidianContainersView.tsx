import React, { useState } from 'react';
import { useObsidianContainers, ContainerPrivacyImpact } from '../context/ObsidianContainersContext';
import { useFoldersContext } from '../context/FoldersContext';
import { useI18n } from '../i18n';
import { ObsidianLogo } from './ObsidianLogo';
import { PrivacyChangeWarningModal } from './PrivacyChangeWarningModal';
import { Modal } from './Modal';
import { ContainerPrivacy, ContainerObserveMode, FolderPrivacy } from '@lenta/shared';
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
} from 'lucide-react';
import dayjs from 'dayjs';

export const ObsidianContainersView: React.FC = () => {
  const { t } = useI18n();
  const {
    containers,
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
      .map((f) => ({
        path: f.path.trim().replace(/^\/+|\/+$/g, ''),
        name: f.name.trim() || f.path.trim().split('/').pop() || f.path.trim(),
        isPrimary: f.isPrimary,
        observeMode: f.observeMode,
        filterTag: f.filterTag?.trim() || undefined,
      }));

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

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
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
        {/* Stat 1: Total Containers */}
        <div className="p-3.5 rounded-xl bg-[#181a1a] border border-[#242828] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-[#93927e] uppercase tracking-wider block">
              Всего контейнеров
            </span>
            <span className="text-xl font-sans font-bold text-[#f3e8ff]">
              {containers.length}
            </span>
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-8">
          {filteredContainers.map((container) => {
            const isPrivate = container.privacy === 'private';
            const isSyncing = isSyncingId === container.id;
            const isCopied = copiedTokenId === container.id;

            return (
              <div
                key={container.id}
                className={`p-5 rounded-2xl bg-[#181a1a] border transition-all duration-200 flex flex-col justify-between relative overflow-hidden group ${
                  isPrivate
                    ? 'border-[#a855f7]/40 hover:border-[#a855f7] hover:shadow-[0_0_25px_rgba(168,85,247,0.15)]'
                    : 'border-[#c9cd58]/40 hover:border-[#c9cd58] hover:shadow-[0_0_25px_rgba(201,205,88,0.15)]'
                }`}
              >
                {/* Top Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border"
                        style={{
                          backgroundColor: isPrivate ? 'rgba(168,85,247,0.15)' : 'rgba(201,205,88,0.15)',
                          borderColor: isPrivate ? 'rgba(168,85,247,0.4)' : 'rgba(201,205,88,0.4)',
                        }}
                      >
                        <ObsidianLogo size={22} />
                      </div>
                      <div>
                        <h3 className="font-sans font-bold text-sm sm:text-base text-[#f3e8ff] flex items-center gap-2">
                          <span>{container.name}</span>
                        </h3>
                        <p className="font-mono text-[11px] text-[#93927e] flex items-center gap-1.5 mt-0.5">
                          <Folder className="w-3 h-3 text-[#c9c7b2]" />
                          <span>{container.vaultPath}</span>
                        </p>
                      </div>
                    </div>

                    {/* Privacy Toggle Button with impact check */}
                    <button
                      onClick={() => handleContainerPrivacyToggle(container.id)}
                      title={`Нажмите, чтобы переключить приватность на ${isPrivate ? 'Public' : 'Private'}`}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 border transition-all ${
                        isPrivate
                          ? 'bg-[#a855f7]/15 border-[#a855f7]/50 text-[#d8b4fe] hover:bg-[#a855f7]/25'
                          : 'bg-[#c9cd58]/15 border-[#c9cd58]/50 text-[#e5e971] hover:bg-[#c9cd58]/25'
                      }`}
                    >
                      {isPrivate ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-[#a855f7]" />
                          <span>{t.privacyPrivate}</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-3.5 h-3.5 text-[#c9cd58]" />
                          <span>{t.privacyPublic}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Description */}
                  {container.description && (
                    <p className="text-xs text-[#c9c7b2] mb-4 leading-relaxed bg-[#121414]/50 p-2.5 rounded-lg border border-[#242828]">
                      {container.description}
                    </p>
                  )}

                  {/* Bound Folders Section */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#93927e] flex items-center gap-1.5">
                        <FolderGit2 className="w-3.5 h-3.5 text-[#a855f7]" />
                        <span>{t.boundFoldersTitle} ({container.boundFolders.length})</span>
                      </span>

                      <button
                        onClick={() => {
                          setBindingFolderContainerId(container.id);
                          setQuickFolderInput({
                            path: '',
                            name: '',
                            observeMode: 'recursive',
                            filterTag: '',
                          });
                        }}
                        className="text-[10px] font-mono font-semibold text-[#a855f7] hover:text-[#d8b4fe] hover:underline flex items-center gap-1"
                      >
                        <FolderPlus className="w-3 h-3" />
                        <span>+ {t.addFolderBinding}</span>
                      </button>
                    </div>

                    {/* Folders Chips / List */}
                    <div className="flex flex-col gap-1.5">
                      {container.boundFolders.map((bf) => (
                        <div
                          key={bf.id}
                          className="px-3 py-2 rounded-lg bg-[#121414] border border-[#242828] flex items-center justify-between text-xs group/folder hover:border-[#383a3a] transition-colors"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <Folder className={`w-3.5 h-3.5 shrink-0 ${bf.isPrimary ? 'text-[#e5e971]' : 'text-[#a855f7]'}`} />
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="font-mono text-xs text-[#e2e2e2] truncate font-medium">
                                {bf.path}
                              </span>
                              {/* Privacy Badge on Bound Folder */}
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold shrink-0 ${
                                bf.privacy === 'private' ? 'bg-[#a855f7]/20 text-[#d8b4fe]' : 'bg-[#c9cd58]/20 text-[#e5e971]'
                              }`}>
                                {bf.privacy === 'private' ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                                <span>{bf.privacy === 'private' ? 'Приватная' : 'Публичная'}</span>
                              </span>
                              {bf.isPrimary && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#c9cd58]/20 text-[#e5e971] border border-[#c9cd58]/40 font-bold shrink-0">
                                  Primary
                                </span>
                              )}
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1e2020] text-[#93927e] border border-[#242828] shrink-0">
                                {bf.observeMode === 'recursive'
                                  ? 'Рекурсивно'
                                  : bf.observeMode === 'filtered'
                                  ? `Тег: ${bf.filterTag || 'all'}`
                                  : 'Прямые файлы'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-mono text-[#93927e]">
                              {bf.notesCount || 0} заметок
                            </span>
                            {container.boundFolders.length > 1 && (
                              <button
                                onClick={() => removeBoundFolder(container.id, bf.id)}
                                title="Отвязать папку"
                                className="p-1 rounded text-[#555] hover:text-[#f87171] hover:bg-[#242828] transition-colors opacity-0 group-hover/folder:opacity-100"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Inline Quick Folder Binding Form */}
                    {bindingFolderContainerId === container.id && (
                      <div className="mt-2.5 p-3.5 rounded-lg bg-[#141616] border border-[#a855f7]/50 flex flex-col gap-2.5 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-xs font-mono font-semibold text-[#d8b4fe]">
                          <span>Привязка папки для наблюдения</span>
                          <button
                            onClick={() => {
                              setBindingFolderContainerId(null);
                              setBindingError('');
                            }}
                            className="p-0.5 rounded text-[#93927e] hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Privacy Containment Rule Indicator */}
                        <div className={`p-2 rounded text-[11px] font-mono flex items-center gap-1.5 ${
                          container.privacy === 'public'
                            ? 'bg-[#c9cd58]/10 text-[#e5e971] border border-[#c9cd58]/30'
                            : 'bg-[#a855f7]/10 text-[#d8b4fe] border border-[#a855f7]/30'
                        }`}>
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {container.privacy === 'public'
                              ? 'Публичный контейнер: можно привязать ТОЛЬКО публичные папки.'
                              : 'Приватный контейнер: можно привязать как приватные, так и публичные папки.'}
                          </span>
                        </div>

                        {bindingError && (
                          <div className="p-2 rounded bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#fca5a5] text-[11px] font-mono flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#ef4444]" />
                            <span>{bindingError}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Путь к папке: 02_Projects/Lenta"
                            value={quickFolderInput.path}
                            onChange={(e) => {
                              setQuickFolderInput((prev) => ({ ...prev, path: e.target.value }));
                              setBindingError('');
                            }}
                            className="bg-[#121414] border border-[#242828] rounded text-xs font-mono px-2.5 py-1.5 text-[#e2e2e2] outline-none focus:border-[#a855f7]"
                          />
                          <select
                            value={quickFolderInput.observeMode}
                            onChange={(e) =>
                              setQuickFolderInput((prev) => ({
                                ...prev,
                                observeMode: e.target.value as ContainerObserveMode,
                              }))
                            }
                            className="bg-[#121414] border border-[#242828] rounded text-xs font-mono px-2.5 py-1.5 text-[#e2e2e2] outline-none focus:border-[#a855f7]"
                          >
                            <option value="recursive">Рекурсивно (все подпапки)</option>
                            <option value="all">Только прямые файлы</option>
                            <option value="filtered">Фильтрация по тегу</option>
                          </select>
                        </div>

                        {/* Quick Pick from Existing Folders */}
                        <div className="flex items-center gap-1 flex-wrap text-[10px] font-mono">
                          <span className="text-[#93927e]">Существующие папки:</span>
                          {folders
                            .filter((f) => container.privacy === 'private' || f.privacy === 'public')
                            .slice(0, 5)
                            .map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => {
                                  setQuickFolderInput((prev) => ({
                                    ...prev,
                                    path: f.path,
                                    name: f.name,
                                  }));
                                  setBindingError('');
                                }}
                                className="px-1.5 py-0.5 rounded bg-[#1e2020] hover:bg-[#282a2a] text-[#c9c7b2] hover:text-[#e5e971] border border-[#2d3030]"
                              >
                                {f.privacy === 'private' ? '🔒 ' : '🌐 '}
                                {f.path}
                              </button>
                            ))}
                        </div>

                        {quickFolderInput.observeMode === 'filtered' && (
                          <input
                            type="text"
                            placeholder="Тег фильтра: topic.project"
                            value={quickFolderInput.filterTag}
                            onChange={(e) =>
                              setQuickFolderInput((prev) => ({
                                ...prev,
                                filterTag: e.target.value,
                              }))
                            }
                            className="bg-[#121414] border border-[#242828] rounded text-xs font-mono px-2.5 py-1.5 text-[#e2e2e2] outline-none focus:border-[#a855f7]"
                          />
                        )}

                        <div className="flex items-center justify-end gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setBindingFolderContainerId(null);
                              setBindingError('');
                            }}
                            className="px-2.5 py-1 rounded bg-[#1e2020] text-xs font-mono text-[#93927e] hover:text-white"
                          >
                            {t.cancel}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickFolderSubmit(container.id)}
                            className="px-3 py-1 rounded bg-[#a855f7] hover:bg-[#b76eff] text-white text-xs font-mono font-semibold"
                          >
                            {t.addFolderBinding}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* API Token Box */}
                  <div className="p-3 rounded-lg bg-[#121414] border border-[#242828] flex flex-col gap-1.5 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#93927e] uppercase tracking-wider">
                        Ключ контейнера (Obsidian Plugin Specified Key)
                      </span>
                      <button
                        onClick={() => {
                          if (window.confirm(t.regenerateTokenConfirm || 'Сгенерировать новый ключ?')) {
                            regenerateToken(container.id);
                          }
                        }}
                        title="Сгенерировать новый ключ"
                        className="text-[10px] font-mono text-[#93927e] hover:text-[#e5e971] flex items-center gap-1"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Обновить</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={container.token}
                        className="flex-1 bg-[#181a1a] border border-[#242828] font-mono text-[11px] px-2.5 py-1.5 text-[#c9c7b2] rounded outline-none select-all truncate"
                      />
                      <button
                        onClick={() => handleCopyToken(container.id, container.token)}
                        className={`px-3 py-1.5 rounded font-mono text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                          isCopied
                            ? 'bg-[#22c55e] text-white'
                            : 'bg-[#1e2020] border border-[#333] hover:border-[#a855f7] text-[#e2e2e2]'
                        }`}
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? t.tokenCopied : t.copyToken}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pending Changes Strip */}
                {(() => {
                  const pending = pendingChanges[container.id] ?? 0;
                  const isPushing = isSyncing && syncDirection === 'push';
                  const isPulling = isSyncing && syncDirection === 'pull';
                  return pending > 0 && !isSyncing ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#c9cd58]/10 border border-[#c9cd58]/30 text-[#e5e971] text-[11px] font-mono mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c9cd58] animate-pulse" />
                      <span>{pending} local change{pending > 1 ? 's' : ''} since last sync</span>
                    </div>
                  ) : null;
                })()}

                {/* Markdown Note Preview Toggle */}
                <button
                  onClick={() =>
                    setExpandedPreviewContainerId(
                      expandedPreviewContainerId === container.id ? null : container.id
                    )
                  }
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#121414] border border-[#242828] hover:border-[#383a3a] text-[11px] font-mono text-[#93927e] hover:text-[#c9c7b2] transition-all mb-3 group"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#a855f7]" />
                    <span>Latest Note Preview</span>
                  </span>
                  {expandedPreviewContainerId === container.id ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Expandable Markdown Preview Card */}
                {expandedPreviewContainerId === container.id && (() => {
                  const mockNotes = [
                    { title: 'Release Planning v2.1', description: '## Overview\n\nThis release focuses on **sync performance** and stability improvements.\n\n- ✅ Field-level LWW merge\n- 🔄 Auto-push on save\n- 📥 Pull delta changes', type: 'EVENT' },
                    { title: 'AI Research Notes', description: '## Key Findings\n\nRecent studies on **transformer architectures** show promising results for long-context reasoning.\n\n> "The attention mechanism remains the core driver of capability scaling"\n\n### References\n- Vaswani et al. 2017\n- GPT-4 Technical Report', type: 'SINGLE' },
                    { title: 'Cinema Release Queue', description: '## Upcoming Premieres\n\n| Title | Date | Rating |\n|---|---|---|\n| Dune: Part Three | 2026-09-15 | ⭐⭐⭐⭐ |\n| Avengers: Endgame II | 2026-11-01 | TBD |', type: 'FILM_RELEASE' },
                  ];
                  const idx = containers.findIndex(c => c.id === container.id) % mockNotes.length;
                  const note = mockNotes[idx];
                  return (
                    <div className="mb-3 p-4 rounded-xl bg-[#0f1111] border border-[#2a2d2d] text-[#c9c7b2]">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#a855f7]/15 text-[#d8b4fe] border border-[#a855f7]/30">
                          {note.type}
                        </span>
                        <span className="text-xs font-semibold text-[#e2e2e2]">{note.title}</span>
                      </div>
                      <div className="prose prose-invert prose-xs max-w-none text-[12px] leading-relaxed [&_h2]:text-[#e5e971] [&_h2]:text-[13px] [&_h2]:font-bold [&_h2]:mb-1 [&_h3]:text-[#c9c7b2] [&_h3]:text-[12px] [&_strong]:text-[#f3e8ff] [&_table]:text-[11px] [&_blockquote]:border-l-[#a855f7] [&_blockquote]:text-[#93927e] [&_li]:text-[#c9c7b2]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {note.description}
                        </ReactMarkdown>
                      </div>
                    </div>
                  );
                })()}

                {/* Footer Controls */}
                <div className="pt-3 border-t border-[#242828] flex items-center justify-between text-xs font-mono text-[#93927e]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                    <span>
                      {container.lastSyncedAt
                        ? `Синхр: ${dayjs(container.lastSyncedAt).format('HH:mm, DD.MM')}`
                        : 'Готов к синхронизации'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Push Button */}
                    <button
                      onClick={() => pushContainer(container.id)}
                      disabled={isSyncing}
                      title="Push local changes to server"
                      className={`px-3 py-1.5 rounded-md font-mono text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isSyncing && syncDirection === 'push'
                          ? 'bg-[#c9cd58]/25 text-[#e5e971] cursor-wait'
                          : isSyncing
                          ? 'opacity-40 cursor-not-allowed bg-[#1e2020] text-[#93927e]'
                          : 'bg-[#1e2020] hover:bg-[#c9cd58]/15 border border-[#333] hover:border-[#c9cd58]/60 text-[#e2e2e2] hover:text-[#e5e971]'
                      }`}
                    >
                      <Upload className={`w-3.5 h-3.5 ${isSyncing && syncDirection === 'push' ? 'animate-bounce text-[#e5e971]' : ''}`} />
                      <span>{isSyncing && syncDirection === 'push' ? 'Pushing...' : 'Push'}</span>
                      {(pendingChanges[container.id] ?? 0) > 0 && !isSyncing && (
                        <span className="w-4 h-4 rounded-full bg-[#c9cd58] text-[#121414] text-[9px] font-bold flex items-center justify-center">
                          {pendingChanges[container.id]}
                        </span>
                      )}
                    </button>

                    {/* Pull Button */}
                    <button
                      onClick={() => pullContainer(container.id)}
                      disabled={isSyncing}
                      title="Pull latest notes from server"
                      className={`px-3 py-1.5 rounded-md font-mono text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isSyncing && syncDirection === 'pull'
                          ? 'bg-[#a855f7]/25 text-[#d8b4fe] cursor-wait'
                          : isSyncing
                          ? 'opacity-40 cursor-not-allowed bg-[#1e2020] text-[#93927e]'
                          : 'bg-[#1e2020] hover:bg-[#a855f7]/15 border border-[#333] hover:border-[#a855f7]/60 text-[#e2e2e2] hover:text-[#d8b4fe]'
                      }`}
                    >
                      <Download className={`w-3.5 h-3.5 ${isSyncing && syncDirection === 'pull' ? 'animate-bounce text-[#d8b4fe]' : ''}`} />
                      <span>{isSyncing && syncDirection === 'pull' ? 'Pulling...' : 'Pull'}</span>
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(t.deleteContainerConfirm || 'Удалить этот контейнер?')) {
                          deleteContainer(container.id);
                        }
                      }}
                      title={t.deleteContainer}
                      className="p-1.5 rounded-md bg-[#1e2020] hover:bg-[#2a1a1a] border border-[#242828] hover:border-[#ef4444] text-[#93927e] hover:text-[#f87171] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
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

