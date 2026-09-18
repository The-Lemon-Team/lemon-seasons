import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LentaSyncEngine } from '../lenta-sync-engine';
import { LentaApiClient } from '../lenta-api-client';
import { TFile, normalizePath } from 'obsidian';
import { LentaPluginSettings, DEFAULT_SETTINGS } from '../../types';

class MockVault {
  private files: Map<string, { file: TFile; content: string }> = new Map();

  adapter = {
    exists: async (path: string) => {
      const normalized = normalizePath(path);
      return this.files.has(normalized);
    },
    read: async (path: string) => {
      const normalized = normalizePath(path);
      const entry = this.files.get(normalized);
      if (!entry) throw new Error(`File not found: ${normalized}`);
      return entry.content;
    },
    write: async (path: string, data: string) => {
      const normalized = normalizePath(path);
      let entry = this.files.get(normalized);
      if (!entry) {
        entry = { file: new TFile(normalized, data), content: data };
        this.files.set(normalized, entry);
      } else {
        entry.content = data;
        entry.file.stat.mtime = Date.now();
      }
    },
    mkdir: async () => {},
    stat: async (path: string) => {
      const normalized = normalizePath(path);
      const entry = this.files.get(normalized);
      return { mtime: entry?.file?.stat?.mtime || Date.now() };
    },
  };

  async read(file: TFile): Promise<string> {
    const normalized = normalizePath(file.path);
    const entry = this.files.get(normalized);
    if (!entry) throw new Error(`File not found: ${normalized}`);
    return entry.content;
  }

  async modify(file: TFile, data: string): Promise<void> {
    const normalized = normalizePath(file.path);
    const entry = this.files.get(normalized);
    if (entry) {
      entry.content = data;
      entry.file.stat.mtime = Date.now();
    } else {
      this.files.set(normalized, { file, content: data });
    }
  }

  async create(path: string, data: string): Promise<TFile> {
    const normalized = normalizePath(path);
    const file = new TFile(normalized, data);
    this.files.set(normalized, { file, content: data });
    return file;
  }

  getAbstractFileByPath(path: string): TFile | null {
    const normalized = normalizePath(path);
    const entry = this.files.get(normalized);
    return entry ? entry.file : null;
  }

  getFiles(): TFile[] {
    return Array.from(this.files.values()).map((e) => e.file);
  }

  getMarkdownFiles(): TFile[] {
    return this.getFiles().filter((f) => f.extension === 'md');
  }

  async trash(file: TFile, _system: boolean): Promise<void> {
    const normalized = normalizePath(file.path);
    this.files.delete(normalized);
  }
}

describe('LentaSyncEngine - Unit & Integration Tests', () => {
  let mockVault: MockVault;
  let mockApp: any;
  let settings: LentaPluginSettings;
  let mockApiClient: any;

  beforeEach(() => {
    mockVault = new MockVault();
    mockApp = {
      vault: mockVault,
    };
    settings = {
      ...DEFAULT_SETTINGS,
      serverUrl: 'http://localhost:3001',
      authToken: 'test-token',
      vaultRootFolder: 'Lemon-Seasons',
    };

    mockApiClient = {
      getFeeds: vi.fn().mockResolvedValue([
        { id: 'feed-mcu', slug: 'mcu-radar', title: 'Marvel Cinematic Universe' },
      ]),
      createNote: vi.fn().mockImplementation(async (dto) => {
        return {
          id: 'server-assigned-uuid-12345',
          title: dto.title,
          description: dto.description,
          type: dto.type,
          startDate: dto.startDate,
          createdAt: '2026-09-19T05:00:00.000Z',
          updatedAt: '2026-09-19T05:00:00.000Z',
        };
      }),
      updateNote: vi.fn().mockImplementation(async (id, dto) => {
        return {
          id,
          title: dto.title,
          description: dto.description,
          type: dto.type,
          startDate: dto.startDate,
          createdAt: '2026-09-19T05:00:00.000Z',
          updatedAt: '2026-09-19T05:05:00.000Z',
        };
      }),
    };
  });

  it('pushLocalNote should create a new note on server and write lenta_id back into markdown frontmatter', async () => {
    const syncEngine = new LentaSyncEngine(
      mockApp,
      mockApiClient as any,
      () => settings,
      async () => {}
    );

    const initialMarkdown = `---
title: "New Obsidian Feature Launch"
type: "EVENT"
start_date: "2026-10-15T12:00:00.000Z"
---

# New Obsidian Feature Launch

This note was created inside Obsidian by a regular user and synced.
`;

    const filePath = 'Lemon-Seasons/01_Daily_Logs/New-Feature.md';
    const testFile = await mockVault.create(filePath, initialMarkdown);

    // Act
    const result = await syncEngine.pushLocalNote(testFile);

    // Assert
    expect(result.success).toBe(true);
    expect(result.note?.id).toBe('server-assigned-uuid-12345');

    // Verify API called with appropriate parameters
    expect(mockApiClient.createNote).toHaveBeenCalledTimes(1);
    expect(mockApiClient.createNote).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Obsidian Feature Launch',
        feedId: undefined,
        type: 'EVENT',
        startDate: '2026-10-15T12:00:00.000Z',
      })
    );

    // Verify local markdown was updated with lenta_id
    const updatedContent = await mockVault.read(testFile);
    expect(updatedContent).toContain('lenta_id: "server-assigned-uuid-12345"');
  });

  it('pushLocalNote should update existing note when lenta_id is already present', async () => {
    const syncEngine = new LentaSyncEngine(
      mockApp,
      mockApiClient as any,
      () => settings,
      async () => {}
    );

    const existingMarkdown = `---
lenta_id: "existing-uuid-9999"
title: "Existing Roadmap Item"
type: "EVENT"
start_date: "2026-10-20T10:00:00.000Z"
---

Updated roadmap description content.
`;

    const filePath = 'Lemon-Seasons/02_Projects/Roadmap.md';
    const testFile = await mockVault.create(filePath, existingMarkdown);

    // Act
    const result = await syncEngine.pushLocalNote(testFile);

    // Assert
    expect(result.success).toBe(true);
    expect(mockApiClient.updateNote).toHaveBeenCalledTimes(1);
    expect(mockApiClient.updateNote).toHaveBeenCalledWith(
      'existing-uuid-9999',
      expect.objectContaining({
        title: 'Existing Roadmap Item',
      })
    );
  });

  it('pushLocalNote against live backend on port 3001 creates a real note', async () => {
    // Check if backend is alive
    let backendAlive = false;
    try {
      const res = await fetch('http://localhost:3001/feeds');
      if (res.status === 200) backendAlive = true;
    } catch {
      backendAlive = false;
    }

    if (!backendAlive) {
      console.warn('Backend is offline, skipping live test.');
      return;
    }

    const realApiClient = new LentaApiClient(
      () => 'http://localhost:3001',
      () => 'lenta_obs_integration_test_token'
    );

    const syncEngine = new LentaSyncEngine(
      mockApp,
      realApiClient,
      () => settings,
      async () => {}
    );

    const noteTitle = `Integration Test Note - ${Date.now()}`;
    const initialMarkdown = `---
title: "${noteTitle}"
type: "EVENT"
start_date: "2026-10-01T10:00:00.000Z"
---

# ${noteTitle}

Created during live LentaSyncEngine integration test.
`;

    const filePath = `Lemon-Seasons/Test/${noteTitle}.md`;
    const testFile = await mockVault.create(filePath, initialMarkdown);

    // Act - push to real server
    const result = await syncEngine.pushLocalNote(testFile);

    expect(result.success).toBe(true);
    expect(result.note?.id).toBeDefined();
    const noteId = result.note!.id;

    // Verify that local file now contains the assigned real lenta_id
    const updatedContent = await mockVault.read(testFile);
    expect(updatedContent).toContain(`lenta_id: "${noteId}"`);

    // Verify note is queryable directly via backend HTTP GET /notes/:id
    const backendRes = await fetch(`http://localhost:3001/notes/${noteId}`);
    expect(backendRes.status).toBe(200);
    const backendData = await backendRes.json();
    expect(backendData.title).toBe(noteTitle);

    // Cleanup note from backend
    await fetch(`http://localhost:3001/notes/${noteId}`, { method: 'DELETE' }).catch(() => {});
  });
});
