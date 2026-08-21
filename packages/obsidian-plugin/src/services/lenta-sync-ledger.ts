import { App, TFile, normalizePath } from 'obsidian';
import {
  Note,
  LentaFrontmatter,
  ParsedMarkdownNote,
  SyncLedger,
  SyncLedgerEntry,
} from '@lenta/shared';

export class LentaSyncLedgerManager {
  private ledger: SyncLedger;
  private readonly ledgerFileName = '.lenta-sync-ledger.json';

  constructor(private app: App, private getVaultRoot: () => string) {
    this.ledger = {
      lastSyncTimestamp: null,
      vaultRootFolder: this.getVaultRoot(),
      entries: {},
    };
  }

  async loadLedger(): Promise<SyncLedger> {
    try {
      const root = normalizePath(this.getVaultRoot());
      const ledgerPath = `${root}/${this.ledgerFileName}`;
      const file = this.app.vault.getAbstractFileByPath(ledgerPath);

      if (file instanceof TFile) {
        const text = await this.app.vault.read(file);
        this.ledger = JSON.parse(text);
      }
    } catch (err) {
      console.warn('Lenta: Creating fresh sync ledger', err);
    }
    return this.ledger;
  }

  async saveLedger(): Promise<void> {
    try {
      const root = normalizePath(this.getVaultRoot());
      const ledgerPath = `${root}/${this.ledgerFileName}`;
      this.ledger.vaultRootFolder = root;
      const jsonStr = JSON.stringify(this.ledger, null, 2);

      const file = this.app.vault.getAbstractFileByPath(ledgerPath);
      if (file instanceof TFile) {
        await this.app.vault.modify(file, jsonStr);
      } else {
        await this.app.vault.create(ledgerPath, jsonStr);
      }
    } catch (err) {
      console.error('Lenta: Failed to save sync ledger', err);
    }
  }

  getEntry(lentaId: string): SyncLedgerEntry | undefined {
    return this.ledger.entries[lentaId];
  }

  recordSync(
    lentaId: string,
    localPath: string,
    serverUpdatedAt: string,
    localMtime: number,
    note: Note,
    body: string
  ): void {
    this.ledger.entries[lentaId] = {
      lentaId,
      localPath,
      lastServerUpdatedAt: serverUpdatedAt,
      lastLocalModifiedAt: localMtime,
      fieldsHash: {
        title: note.title,
        description: body,
        type: note.type,
        startDate: note.startDate,
        endDate: note.endDate,
        primaryFolder:
          note.folders?.find((f) => f.isPrimary)?.folder?.path ||
          note.folders?.[0]?.folder?.path,
        folders: note.folders?.map((f) => f.folder?.path).sort().join(','),
        taxonomy: note.tags?.map((t) => t.path).sort().join(','),
        tags: note.hashtags?.map((h) => h.name).sort().join(','),
      },
    };
  }

  updateLocalPath(lentaId: string, newPath: string): void {
    if (this.ledger.entries[lentaId]) {
      this.ledger.entries[lentaId].localPath = newPath;
      this.ledger.entries[lentaId].lastLocalModifiedAt = Date.now();
    }
  }

  removeEntry(lentaId: string): void {
    delete this.ledger.entries[lentaId];
  }

  /**
   * Field-Level Last-Write-Wins (LWW) resolution:
   * Compares local parsed fields and incoming server note against the last ledger snapshot.
   */
  resolveFieldLevelMerge(
    local: ParsedMarkdownNote,
    serverNote: Note,
    localMtime: number
  ): {
    mergedTitle: string;
    mergedBody: string;
    mergedType: string;
    mergedStartDate: string;
    mergedEndDate: string | null;
    mergedPrimaryFolder?: string;
    mergedTaxonomy: string[];
    mergedTags: string[];
    isConflict: boolean;
    conflicts: string[];
  } {
    const entry = this.getEntry(serverNote.id);
    const conflicts: string[] = [];

    // If no ledger entry exists (first sync of this note), server is authoritative
    if (!entry) {
      return {
        mergedTitle: serverNote.title,
        mergedBody: serverNote.description || '',
        mergedType: serverNote.type,
        mergedStartDate: serverNote.startDate,
        mergedEndDate: serverNote.endDate,
        mergedPrimaryFolder:
          serverNote.folders?.find((f) => f.isPrimary)?.folder?.path ||
          serverNote.folders?.[0]?.folder?.path,
        mergedTaxonomy: serverNote.tags?.map((t) => t.path) || [],
        mergedTags: serverNote.hashtags?.map((h) => h.name) || [],
        isConflict: false,
        conflicts: [],
      };
    }

    const snap = entry.fieldsHash;
    const serverTime = new Date(serverNote.updatedAt).getTime();
    const localTime = localMtime;
    const localWins = localTime >= serverTime;

    // 1. Title
    let mergedTitle = serverNote.title;
    const localTitleChanged = local.title !== snap.title;
    const serverTitleChanged = serverNote.title !== snap.title;
    if (localTitleChanged && !serverTitleChanged) {
      mergedTitle = local.title;
    } else if (localTitleChanged && serverTitleChanged) {
      conflicts.push('title');
      mergedTitle = localWins ? local.title : serverNote.title;
    }

    // 2. Description / Body
    let mergedBody = serverNote.description || '';
    const localBodyChanged = local.body !== snap.description;
    const serverBodyChanged = (serverNote.description || '') !== (snap.description || '');
    if (localBodyChanged && !serverBodyChanged) {
      mergedBody = local.body;
    } else if (localBodyChanged && serverBodyChanged) {
      conflicts.push('description');
      mergedBody = localWins ? local.body : (serverNote.description || '');
    }

    // 3. Type
    let mergedType = serverNote.type;
    const localType = local.frontmatter.type || 'EVENT';
    const localTypeChanged = localType !== snap.type;
    const serverTypeChanged = serverNote.type !== snap.type;
    if (localTypeChanged && !serverTypeChanged) {
      mergedType = localType;
    } else if (localTypeChanged && serverTypeChanged) {
      conflicts.push('type');
      mergedType = localWins ? localType : serverNote.type;
    }

    // 4. Start Date
    let mergedStartDate = serverNote.startDate;
    const localStart = local.frontmatter.start_date || local.frontmatter.startDate || serverNote.startDate;
    const localStartChanged = localStart !== snap.startDate;
    const serverStartChanged = serverNote.startDate !== snap.startDate;
    if (localStartChanged && !serverStartChanged) {
      mergedStartDate = localStart;
    } else if (localStartChanged && serverStartChanged) {
      conflicts.push('startDate');
      mergedStartDate = localWins ? localStart : serverNote.startDate;
    }

    // 5. End Date
    let mergedEndDate = serverNote.endDate;
    const localEnd = local.frontmatter.end_date ?? local.frontmatter.endDate ?? null;
    const localEndChanged = localEnd !== snap.endDate;
    const serverEndChanged = serverNote.endDate !== snap.endDate;
    if (localEndChanged && !serverEndChanged) {
      mergedEndDate = localEnd;
    } else if (localEndChanged && serverEndChanged) {
      conflicts.push('endDate');
      mergedEndDate = localWins ? localEnd : serverNote.endDate;
    }

    // 6. Primary Folder
    const localPrimary = local.frontmatter.primary_folder || undefined;
    const serverPrimary =
      serverNote.folders?.find((f) => f.isPrimary)?.folder?.path ||
      serverNote.folders?.[0]?.folder?.path;
    let mergedPrimaryFolder = serverPrimary;
    const localFolderChanged = localPrimary !== snap.primaryFolder;
    const serverFolderChanged = serverPrimary !== snap.primaryFolder;
    if (localFolderChanged && !serverFolderChanged) {
      mergedPrimaryFolder = localPrimary;
    } else if (localFolderChanged && serverFolderChanged) {
      conflicts.push('primaryFolder');
      mergedPrimaryFolder = localWins ? localPrimary : serverPrimary;
    }

    // 7. Taxonomy
    const localTaxonomy = local.frontmatter.taxonomy || [];
    const serverTaxonomy = serverNote.tags?.map((t) => t.path) || [];
    const mergedTaxonomy = Array.from(new Set([...localTaxonomy, ...serverTaxonomy]));

    // 8. Tags / Hashtags
    const localTags = local.hashtags || [];
    const serverTags = serverNote.hashtags?.map((h) => h.name.replace(/^#/, '')) || [];
    const mergedTags = Array.from(new Set([...localTags, ...serverTags]));

    return {
      mergedTitle,
      mergedBody,
      mergedType,
      mergedStartDate,
      mergedEndDate,
      mergedPrimaryFolder,
      mergedTaxonomy,
      mergedTags,
      isConflict: conflicts.length > 0,
      conflicts,
    };
  }

  get lastSyncTimestamp(): string | null {
    return this.ledger.lastSyncTimestamp;
  }

  set lastSyncTimestamp(val: string | null) {
    this.ledger.lastSyncTimestamp = val;
  }
}
