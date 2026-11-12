import test from 'node:test';
import assert from 'node:assert/strict';
import * as crypto from 'node:crypto';
import { BusDatabase, SseManager, GoogleDriveCloudWatcher } from '../dist/server/index.js';

test('GoogleDriveCloudWatcher scans folders, ingests markdown, and broadcasts to SSE', async () => {
  const db = new BusDatabase({ dbPath: ':memory:' });
  const sse = new SseManager(1000);

  // Generate fake RSA key for test
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const mockFiles = new Map([
    [
      'file-1',
      '---\ntitle: "Test Spark Note"\nevent_date: "2026-11-08"\n---\n# Test Body\n\nAutomated note.',
    ],
  ]);

  let downloadCalls = 0;
  const mockFetch = async (urlStr, opts = {}) => {
    const url = new URL(urlStr);

    if (url.pathname === '/token') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'fake-token-123', expires_in: 3600 }),
      };
    }

    if (url.pathname === '/drive/v3/files' && url.searchParams.get('q')?.includes('folder')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          files: [
            { id: 'root-id', name: 'Spark', parents: [] },
            { id: 'crypto-folder-id', name: 'crypto', parents: ['root-id'] },
          ],
        }),
      };
    }

    if (url.pathname === '/drive/v3/files' && url.searchParams.get('q')?.includes('text/markdown')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          files: [
            {
              id: 'file-1',
              name: '08.11.26 - Test Spark Note.md',
              mimeType: 'text/markdown',
              parents: ['crypto-folder-id'],
              trashed: false,
              modifiedTime: '2026-11-08T10:00:00.000Z',
            },
          ],
        }),
      };
    }

    if (url.pathname === '/drive/v3/changes/startPageToken') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ startPageToken: 'token-1' }),
      };
    }

    if (url.pathname === '/drive/v3/changes') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          newStartPageToken: 'token-2',
          changes: [
            {
              file: {
                id: 'file-1',
                name: '08.11.26 - Test Spark Note.md',
                mimeType: 'text/markdown',
                parents: ['crypto-folder-id'],
                trashed: false,
                modifiedTime: '2026-11-08T10:00:00.000Z',
              },
            },
          ],
        }),
      };
    }

    if (url.pathname === '/drive/v3/files/file-1') {
      downloadCalls++;
      return {
        ok: true,
        status: 200,
        text: async () => mockFiles.get('file-1'),
      };
    }

    return { ok: false, status: 404, statusText: 'Not found' };
  };

  const watcher = new GoogleDriveCloudWatcher({
    serviceAccount: {
      client_email: 'test@example.iam.gserviceaccount.com',
      private_key: privateKey,
      token_uri: 'https://oauth2.googleapis.com/token',
    },
    rootFolderId: 'root-id',
    db,
    sse,
    pollIntervalMs: 100_000,
    fetchImpl: mockFetch,
  });

  await watcher.refreshFolderTree();
  const processed = await watcher.pollChanges();

  assert.equal(processed, 1);
  assert.equal(downloadCalls, 1);

  // Second poll cycle with unchanged file in Google Drive MUST NOT download content again
  const secondProcessed = await watcher.pollChanges();
  assert.equal(secondProcessed, 0);
  assert.equal(downloadCalls, 1, 'Redundant download was prevented by mtime pre-check');

  // Check that spark doc exists in Claim Check
  const doc = db.getSparkDocument('Spark/crypto/08.11.26 - Test Spark Note.md');
  assert.ok(doc);
  assert.equal(doc.feedSlug, 'spark-crypto');
  assert.equal(doc.title, 'Test Spark Note');

  // Check that event was stored in hot stack
  const stats = db.getStats();
  assert.equal(stats.totalEvents, 1);
  assert.equal(stats.totalSparks, 1);

  await watcher.stop();
  db.close();
});
