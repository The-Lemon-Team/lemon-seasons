import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LentaApiClient } from '../lenta-api-client';
import { LentaSyncEngine } from '../lenta-sync-engine';
import { DEFAULT_SETTINGS, LentaPluginSettings } from '../../types';

const mockRequestUrl = vi.fn();

vi.mock('obsidian', () => ({
  requestUrl: (params: any) => mockRequestUrl(params),
  normalizePath: (p: string) => p,
  Notice: vi.fn(),
  TFile: class {},
  TFolder: class {},
}));

describe('Workstation Session Sync & Google Drive Relay', () => {
  let client: LentaApiClient;
  const baseUrl = 'http://localhost:3001';

  beforeEach(() => {
    vi.clearAllMocks();
    client = new LentaApiClient(
      () => baseUrl,
      () => 'test-auth-token'
    );
  });

  describe('LentaApiClient session endpoints', () => {
    it('getSyncStatus queries /sync/status with deviceId', async () => {
      mockRequestUrl.mockResolvedValueOnce({
        status: 200,
        json: {
          deviceId: 'obsidian-pc',
          activeSession: { id: 'sess-1', title: 'Work Session', status: 'ACTIVE' },
          lastCommit: { id: 'commit-123', createdAt: '2026-10-02T00:00:00Z', entitiesCount: 3, isPushed: true },
          pendingChangesCount: 2,
          gdrive: { connected: true, unpushedCommitsCount: 0 },
        },
      });

      const res = await client.getSyncStatus('obsidian-pc');
      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${baseUrl}/sync/status?deviceId=obsidian-pc`,
          method: 'GET',
        })
      );
      expect(res.activeSession?.title).toBe('Work Session');
      expect(res.pendingChangesCount).toBe(2);
    });

    it('startSession posts to /sync/session/start', async () => {
      mockRequestUrl.mockResolvedValueOnce({
        status: 201,
        json: { id: 'sess-new', title: 'Sprint Planning', deviceId: 'pc-1', status: 'ACTIVE' },
      });

      const res = await client.startSession({
        title: 'Sprint Planning',
        deviceId: 'pc-1',
        author: 'Alex',
      });

      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${baseUrl}/sync/session/start`,
          method: 'POST',
        })
      );
      expect(res.id).toBe('sess-new');
    });

    it('recordSessionChange posts change delta to /sync/session/change', async () => {
      mockRequestUrl.mockResolvedValueOnce({
        status: 201,
        json: { id: 'change-1', entityType: 'NOTE', action: 'UPSERT' },
      });

      const res = await client.recordSessionChange(
        {
          entityType: 'NOTE',
          entityId: 'note-123',
          action: 'UPSERT',
          payload: { title: 'Test Note' },
        },
        'pc-1'
      );

      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${baseUrl}/sync/session/change?deviceId=pc-1`,
          method: 'POST',
        })
      );
      expect(res.entityType).toBe('NOTE');
    });

    it('commitSession seals session and requests autoPush', async () => {
      mockRequestUrl.mockResolvedValueOnce({
        status: 200,
        json: {
          success: true,
          commit: { id: 'commit-hash-abc', entitiesCount: 5, isPushed: true },
        },
      });

      const res = await client.commitSession(
        'sess-1',
        { summary: 'Session completed', autoPush: true },
        'pc-1'
      );

      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${baseUrl}/sync/session/sess-1/commit?deviceId=pc-1`,
          method: 'POST',
        })
      );
      expect(res.success).toBe(true);
      expect(res.commit.id).toBe('commit-hash-abc');
    });

    it('pullSync posts to /sync/pull', async () => {
      mockRequestUrl.mockResolvedValueOnce({
        status: 200,
        json: { pulledCommits: ['c1', 'c2'] },
      });

      const res = await client.pullSync('pc-1');
      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${baseUrl}/sync/pull?deviceId=pc-1`,
          method: 'POST',
        })
      );
      expect(res.pulledCommits).toEqual(['c1', 'c2']);
    });
  });

  describe('LentaSyncEngine workstation session integration', () => {
    it('commitWorkstationSession seals active session and updates settings', async () => {
      const settings: LentaPluginSettings = {
        ...DEFAULT_SETTINGS,
        deviceId: 'obsidian-pc',
      };
      const saveSettings = vi.fn(async () => {});

      const mockApp: any = {
        vault: {
          getAbstractFileByPath: vi.fn(),
          read: vi.fn(),
          modify: vi.fn(),
        },
      };

      const engine = new LentaSyncEngine(
        mockApp,
        client,
        () => settings,
        saveSettings
      );

      // Mock getActiveSession & commitSession
      mockRequestUrl.mockImplementation(async (params: any) => {
        if (params.url.includes('/sync/session/active')) {
          return {
            status: 200,
            json: { id: 'sess-active-1', title: 'Active Session Title', status: 'ACTIVE' },
          };
        }
        if (params.url.includes('/commit')) {
          return {
            status: 200,
            json: {
              success: true,
              commit: { id: 'commit-sealed-999', entitiesCount: 4, isPushed: true },
            },
          };
        }
        return { status: 200, json: {} };
      });

      const result = await engine.commitWorkstationSession('My Commit Summary');

      expect(result.success).toBe(true);
      expect(result.commit?.id).toBe('commit-sealed-999');
      expect(settings.lastSyncedCommit).toBe('commit-sealed-999');
      expect(saveSettings).toHaveBeenCalled();
    });
  });
});
