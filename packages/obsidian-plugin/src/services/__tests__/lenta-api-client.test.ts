import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LentaApiClient } from '../lenta-api-client';

const mockRequestUrl = vi.fn();

vi.mock('obsidian', () => ({
  requestUrl: (params: any) => mockRequestUrl(params),
}));

describe('LentaApiClient - listContainers', () => {
  let client: LentaApiClient;
  const baseUrl = 'http://localhost:4000/api';
  const containerBaseUrl = 'http://localhost:3000';

  beforeEach(() => {
    vi.clearAllMocks();
    client = new LentaApiClient(
      () => baseUrl,
      () => 'test-auth-token',
      () => containerBaseUrl,
      () => 'test-api-key',
      () => 'test-container-key'
    );
  });

  it('should fetch containers from container sync server and synthesize feeds', async () => {
    mockRequestUrl.mockImplementation(async (params: { url: string }) => {
      if (params.url === `${containerBaseUrl}/containers`) {
        return {
          status: 200,
          json: [
            { id: 'c1', name: 'Public Vault', type: 'git', totalFiles: 10, isPublic: true },
            { id: 'c2-secret', name: 'Secret Notes', type: 'simple', totalNotes: 5 },
          ],
        };
      }
      if (params.url === `${baseUrl}/feeds`) {
        return {
          status: 200,
          json: [
            { id: 'f1', slug: 'tech', title: 'Tech Feed', _count: { notes: 12 } },
          ],
        };
      }
      if (params.url === `${baseUrl}/keys`) {
        return { status: 200, json: [] };
      }
      if (params.url.includes('/containers/by-key/')) {
        return {
          status: 200,
          json: { id: 'by-key-cont', name: 'By Key Vault', type: 'git' },
        };
      }
      return { status: 200, json: [] };
    });

    const containers = await client.listContainers();

    // Verify sync server containers are included
    const c1 = containers.find((c) => c.id === 'c1');
    expect(c1).toBeDefined();
    expect(c1?.name).toBe('Public Vault');
    expect(c1?.isPublic).toBe(true);
    expect(c1?.visibility).toBe('public');

    // Verify keyword privacy resolution (id containing 'secret')
    const c2 = containers.find((c) => c.id === 'c2-secret');
    expect(c2).toBeDefined();
    expect(c2?.isPublic).toBe(false);
    expect(c2?.visibility).toBe('private');

    // Verify master feed container synthesis
    const feedAll = containers.find((c) => c.id === 'feed-all');
    expect(feedAll).toBeDefined();
    expect(feedAll?.totalNotes).toBe(12);

    // Verify individual feed synthesis
    const techFeed = containers.find((c) => c.id === 'feed-tech');
    expect(techFeed).toBeDefined();
    expect(techFeed?.name).toBe('📰 Feed: Tech Feed');

    // Verify default private user vault
    const userVault = containers.find((c) => c.id === 'cont-private-user-vault');
    expect(userVault).toBeDefined();
    expect(userVault?.visibility).toBe('private');
  });

  it('should handle container sync server errors gracefully (fallback to feeds & user vault)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockRequestUrl.mockImplementation(async (params: { url: string }) => {
      if (params.url === `${containerBaseUrl}/containers`) {
        throw new Error('Sync server offline (503 Service Unavailable)');
      }
      if (params.url === `${baseUrl}/feeds`) {
        return {
          status: 200,
          json: [{ id: 'f1', slug: 'daily', title: 'Daily Journal', _count: { notes: 3 } }],
        };
      }
      if (params.url === `${baseUrl}/keys`) {
        return { status: 200, json: [] };
      }
      return { status: 200, json: [] };
    });

    const containers = await client.listContainers();

    // Should log warning for sync server failure (exercising catch block on lines 394-396)
    expect(warnSpy).toHaveBeenCalledWith(
      'Could not fetch containers from sync server, using fallback feeds:',
      expect.any(Error)
    );

    // Should still return feed-all, synthesized feed, and private user vault
    expect(containers.some((c) => c.id === 'feed-all')).toBe(true);
    expect(containers.some((c) => c.id === 'feed-daily')).toBe(true);
    expect(containers.some((c) => c.id === 'cont-private-user-vault')).toBe(true);

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should resolve privacy flags correctly based on explicit props and keywords', async () => {
    mockRequestUrl.mockImplementation(async (params: { url: string }) => {
      if (params.url === `${containerBaseUrl}/containers`) {
        return {
          status: 200,
          json: [
            { id: '1', name: 'Normal', visibility: 'private' },
            { id: '2', name: 'Normal', isPublic: false },
            { id: '3', name: 'Normal', visibility: 'public' },
            { id: '4', name: 'Normal', isPublic: true },
            { id: 'myspace-vault', name: 'My Notes' },
            { id: '5', name: 'Personal Diary' },
          ],
        };
      }
      return { status: 200, json: [] };
    });

    const containers = await client.listContainers();

    expect(containers.find((c) => c.id === '1')?.visibility).toBe('private');
    expect(containers.find((c) => c.id === '2')?.visibility).toBe('private');
    expect(containers.find((c) => c.id === '3')?.visibility).toBe('public');
    expect(containers.find((c) => c.id === '4')?.visibility).toBe('public');
    expect(containers.find((c) => c.id === 'myspace-vault')?.visibility).toBe('private');
    expect(containers.find((c) => c.id === '5')?.visibility).toBe('private');
  });

  it('should resolve active container IDs and specified keys', async () => {
    mockRequestUrl.mockImplementation(async (params: { url: string }) => {
      if (params.url === `${containerBaseUrl}/containers`) {
        return { status: 200, json: [] };
      }
      if (params.url.includes('/containers/by-key/custom-key-xyz')) {
        return {
          status: 200,
          json: { id: 'cont-custom-key-xyz', name: 'Custom Vault', type: 'git' },
        };
      }
      return { status: 200, json: [] };
    });

    const containers = await client.listContainers({
      specifiedKey: 'custom-key-xyz',
      activeContainerIds: ['active-id-999'],
    });

    expect(containers.some((c) => c.id.includes('custom-key-xyz'))).toBe(true);
    expect(containers.some((c) => c.id.includes('active-id-999'))).toBe(true);
  });
});
