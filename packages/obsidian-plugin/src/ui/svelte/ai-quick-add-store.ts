import { writable, derived, get } from 'svelte/store';
import type { App } from 'obsidian';
import { normalizePath, TFile, Notice } from 'obsidian';
import type { LentaApiClient } from '../../services/lenta-api-client';
import { LentaFrontmatterUtil } from '../../services/lenta-frontmatter';
import type {
  LentaPluginSettings,
  ParsedNoteCard,
  ParseNotesContext,
  NoteType,
} from '../../types';

export function createAiQuickAddStore() {
  const inputText = writable<string>('');
  const isParsing = writable<boolean>(false);
  const isSaving = writable<boolean>(false);
  const errorMessage = writable<string | null>(null);
  const cards = writable<ParsedNoteCard[]>([]);

  const selectedCards = derived(cards, ($cards) => $cards.filter((c) => c.selected));
  const selectedCount = derived(selectedCards, ($selected) => $selected.length);
  const totalCount = derived(cards, ($cards) => $cards.length);

  async function parse(apiClient: LentaApiClient, context?: ParseNotesContext) {
    const text = get(inputText).trim();
    if (!text) {
      errorMessage.set('Пожалуйста, введите текст для разбора.');
      return;
    }

    isParsing.set(true);
    errorMessage.set(null);

    try {
      const res = await apiClient.parseAiNotes(text, context);
      const parsedCards = res.cards || [];
      if (parsedCards.length === 0) {
        errorMessage.set('Не удалось выделить карточки из текста. Попробуйте другой формат или список.');
      } else {
        cards.set(parsedCards.map((c, i) => ({ ...c, selected: true, tempId: c.tempId || `temp-${i + 1}` })));
      }
    } catch (err: any) {
      errorMessage.set(`Ошибка AI разбора: ${err?.message || err}`);
    } finally {
      isParsing.set(false);
    }
  }

  function toggleCard(tempId: string) {
    cards.update(($cards) =>
      $cards.map((c) => (c.tempId === tempId ? { ...c, selected: !c.selected } : c))
    );
  }

  function toggleSelectAll(select: boolean) {
    cards.update(($cards) => $cards.map((c) => ({ ...c, selected: select })));
  }

  function updateCard(tempId: string, patch: Partial<ParsedNoteCard>) {
    cards.update(($cards) =>
      $cards.map((c) => {
        if (c.tempId !== tempId) return c;
        const updated = { ...c, ...patch };
        // If displayType changed to/from Trend, align note type
        if (patch.displayType === 'Trend') {
          updated.type = updated.endDate ? 'PERIOD' : 'SINGLE';
          if (!updated.hashtags) updated.hashtags = [];
          if (!updated.hashtags.includes('тренд')) updated.hashtags.unshift('тренд');
        }
        return updated;
      })
    );
  }

  function removeCard(tempId: string) {
    cards.update(($cards) => $cards.filter((c) => c.tempId !== tempId));
  }

  function addEmptyCard(defaultDate?: string, defaultFolder?: string) {
    const newId = `temp-manual-${Date.now()}`;
    const newCard: ParsedNoteCard = {
      tempId: newId,
      title: 'Новый тренд',
      type: 'SINGLE',
      displayType: 'Trend',
      startDate: defaultDate || new Date().toISOString(),
      endDate: null,
      feedSlug: 'my-notes',
      feedTitle: 'My Notes',
      folder: defaultFolder || 'Trends',
      hashtags: ['тренд'],
      icon: 'trending-up',
      description: '',
      selected: true,
    };
    cards.update(($cards) => [...$cards, newCard]);
  }

  async function saveSelected(
    app: App,
    apiClient: LentaApiClient,
    settings: LentaPluginSettings,
    targetContainerId?: string,
    targetContainerName?: string,
  ): Promise<{ success: boolean; createdPaths: string[]; error?: string }> {
    const toSave = get(selectedCards);
    if (toSave.length === 0) {
      return { success: false, createdPaths: [], error: 'Не выбрано ни одной карточки для добавления' };
    }

    isSaving.set(true);
    errorMessage.set(null);

    const createdPaths: string[] = [];
    const rootFolder = settings.vaultRootFolder || 'Lenta';

    try {
      // 1. Prepare batch payload for backend
      const batchPayload = toSave.map((c) => ({
        title: c.title.trim(),
        type: c.type,
        startDate: c.startDate.includes('T') ? c.startDate : new Date(`${c.startDate}T12:00:00.000Z`).toISOString(),
        endDate: c.endDate ? (c.endDate.includes('T') ? c.endDate : new Date(`${c.endDate}T23:59:59.000Z`).toISOString()) : undefined,
        folder: c.folder || 'Notes',
        folders: c.folder ? [c.folder] : undefined,
        feedId: c.feedId,
        hashtags: c.hashtags,
        tagIds: c.taxonomyPath ? [c.taxonomyPath] : c.tagIds,
        sourceLink: c.sourceLink,
        icon: c.icon,
        description: c.description,
        containerId: targetContainerId,
      }));

      // 2. Call backend batch creation
      const res = await apiClient.createNotesBatch(batchPayload);
      const createdNotes = res.notes || [];

      // 3. Create local Obsidian markdown files for each created note
      for (const note of createdNotes) {
        try {
          const resolvedFolder = note.folders?.[0]?.folder?.path || 'Notes';
          let vaultPath: string;

          if (targetContainerId && targetContainerName) {
            const safeContainerName = targetContainerName.replace(/[\\/:*?"<>|]/g, '_');
            const cleanTitle = (note.title || 'Untitled').replace(/[\\/:*?"<>|]/g, '-').trim();
            const cleanFolder = resolvedFolder.replace(/^\/+|\/+$/g, '');
            vaultPath = normalizePath(`${rootFolder}/${safeContainerName}/${cleanFolder}/${cleanTitle}.md`);
          } else {
            vaultPath = normalizePath(LentaFrontmatterUtil.getNoteVaultPath(note as any, rootFolder));
          }

          const markdown = LentaFrontmatterUtil.serializeNoteToMarkdown(note as any);

          // Ensure directory exists
          const dir = vaultPath.substring(0, vaultPath.lastIndexOf('/'));
          if (dir && !app.vault.getAbstractFileByPath(dir)) {
            const parts = dir.split('/');
            let cur = '';
            for (const p of parts) {
              cur = cur ? `${cur}/${p}` : p;
              const norm = normalizePath(cur);
              if (!app.vault.getAbstractFileByPath(norm)) {
                await app.vault.createFolder(norm);
              }
            }
          }

          // Handle duplicate filename collisions
          let finalVaultPath = vaultPath;
          const existingFile = app.vault.getAbstractFileByPath(finalVaultPath);
          if (existingFile instanceof TFile) {
            const dirPath = finalVaultPath.substring(0, finalVaultPath.lastIndexOf('/'));
            const baseWithExt = finalVaultPath.substring(finalVaultPath.lastIndexOf('/') + 1);
            const dotIdx = baseWithExt.lastIndexOf('.');
            const baseName = dotIdx !== -1 ? baseWithExt.substring(0, dotIdx) : baseWithExt;
            const ext = dotIdx !== -1 ? baseWithExt.substring(dotIdx) : '.md';

            let counter = 1;
            let candidate = `${dirPath}/${baseName} (${counter})${ext}`;
            while (app.vault.getAbstractFileByPath(candidate)) {
              counter++;
              candidate = `${dirPath}/${baseName} (${counter})${ext}`;
            }
            finalVaultPath = normalizePath(candidate);
          }

          await app.vault.create(finalVaultPath, markdown);
          createdPaths.push(finalVaultPath);
        } catch (fileErr) {
          console.error(`Failed to write local vault file for note "${note.title}":`, fileErr);
        }
      }

      new Notice(`✨ Успешно создано ${createdNotes.length} карточек в Lenta!`);
      return { success: true, createdPaths };
    } catch (err: any) {
      const msg = `Ошибка сохранения карточек: ${err?.message || err}`;
      errorMessage.set(msg);
      return { success: false, createdPaths, error: msg };
    } finally {
      isSaving.set(false);
    }
  }

  return {
    inputText,
    isParsing,
    isSaving,
    errorMessage,
    cards,
    selectedCards,
    selectedCount,
    totalCount,
    parse,
    toggleCard,
    toggleSelectAll,
    updateCard,
    removeCard,
    addEmptyCard,
    saveSelected,
  };
}
