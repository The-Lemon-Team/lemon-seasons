import test from 'node:test';
import assert from 'node:assert/strict';
import { WatchersApiClient, WatchersNeuron } from '../dist/index.js';

test('WatchersApiClient builds SSE URL and query parameters accurately', () => {
  const client = new WatchersApiClient({ baseUrl: 'http://localhost:3040/' });
  const sseUrl = client.getSseUrl({
    categories: ['ai', 'cybersec'],
    watchers: ['deepmind-blog'],
    replay: 10,
  });

  assert.equal(
    sseUrl,
    'http://localhost:3040/api/v1/streams/live?categories=ai%2Ccybersec&watchers=deepmind-blog&replay=10'
  );
});

test('WatchersNeuron manages stream pagination, promote/dismiss, and live SSE buffering', async () => {
  const streamItems = [
    {
      id: 'w-1',
      watcherId: 'watcher-ai',
      watcherSlug: 'deepmind-blog',
      watcherTitle: 'DeepMind Blog',
      category: 'ai',
      feedSlug: 'spark-ai',
      guid: 'guid-1',
      url: 'https://deepmind.google/1',
      title: 'Gemini 4 Release',
      teaser: 'Teaser 1',
      author: 'DeepMind',
      pubDate: new Date().toISOString(),
      categories: ['ai'],
      status: 'NEW',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'w-2',
      watcherId: 'watcher-sec',
      watcherSlug: 'bleeping',
      watcherTitle: 'BleepingComputer',
      category: 'cybersec',
      feedSlug: 'spark-sec',
      guid: 'guid-2',
      url: 'https://bleepingcomputer.com/2',
      title: 'Zero-Day Patch',
      teaser: 'Teaser 2',
      author: 'Bleeping',
      pubDate: new Date().toISOString(),
      categories: ['cybersec'],
      status: 'NEW',
      createdAt: new Date().toISOString(),
    },
  ];

  const mockClient = {
    async getFolders() {
      return [
        {
          id: 'fld-1',
          slug: 'ai',
          title: 'AI & Нейросети',
          description: '',
          icon: '🤖',
          color: '#6366f1',
          isSystem: false,
        },
      ];
    },
    async getWatchers() {
      return [
        {
          id: 'watcher-ai',
          slug: 'deepmind-blog',
          title: 'DeepMind Blog',
          category: 'ai',
          feedSlug: 'spark-ai',
          status: 'IDLE',
          enabled: true,
          totalItemsIngested: 12,
          lastPingAt: null,
        },
      ];
    },
    async getStreamItems(query) {
      const filtered = streamItems.filter((item) =>
        query.status && query.status !== 'ALL' ? item.status === query.status : true
      );
      return {
        items: filtered,
        total: filtered.length,
        limit: query.limit || 30,
        offset: query.offset || 0,
        counts: {
          newCount: streamItems.filter((i) => i.status === 'NEW').length,
          promotedCount: streamItems.filter((i) => i.status === 'PROMOTED').length,
          dismissedCount: streamItems.filter((i) => i.status === 'DISMISSED').length,
          totalCount: streamItems.length,
        },
      };
    },
    async promoteItem(id) {
      const item = streamItems.find((i) => i.id === id);
      item.status = 'PROMOTED';
      return { item: { ...item }, article: { id: 'note-1' } };
    },
    async dismissItem(id) {
      const item = streamItems.find((i) => i.id === id);
      item.status = 'DISMISSED';
      return { item: { ...item } };
    },
    async batchPromote() {
      return { count: 0, articles: [] };
    },
    async batchDismiss() {
      return { count: 0, items: [] };
    },
    async triggerAllWatchers() {
      return { message: 'ok' };
    },
    async pauseAllWatchers() {
      return { message: 'paused' };
    },
    async resumeAllWatchers() {
      return { message: 'resumed' };
    },
    async setWatcherEnabled(id, enabled) {
      return {
        message: 'updated',
        watcher: {
          id,
          slug: 'deepmind-blog',
          title: 'DeepMind Blog',
          category: 'ai',
          feedSlug: 'spark-ai',
          status: enabled ? 'IDLE' : 'PAUSED',
          enabled,
          totalItemsIngested: 12,
          lastPingAt: null,
        },
      };
    },
    async triggerWatcher(id) {
      return {
        id: 'ping-1',
        watcherId: id,
        statusCode: 200,
        latencyMs: 50,
        itemsFound: 5,
        newItemsCount: 0,
        createdAt: new Date().toISOString(),
      };
    },
    async validateFeed(url) {
      return { valid: true, statusCode: 200, itemsCount: 3 };
    },
    async createWatcher(input) {
      return {
        config: input,
        state: {
          id: 'watcher-new',
          slug: 'pub-new',
          title: input.title,
          category: input.category || 'ai',
          feedSlug: 'spark-ai',
          status: 'IDLE',
          enabled: true,
          totalItemsIngested: 0,
          lastPingAt: null,
        },
      };
    },
    async pruneExpired() {
      return { pruned: 0, ttlHours: 72 };
    },
  };

  const neuron = new WatchersNeuron({ apiClient: mockClient });
  await neuron.loadMetadata();
  assert.equal(neuron.state.folders.length, 1);
  assert.equal(neuron.state.watchers.length, 1);

  await neuron.loadInitial({ status: 'NEW' });
  assert.equal(neuron.state.items.length, 2);
  assert.equal(neuron.state.counts.newCount, 2);

  // Promote w-1 -> removed from NEW view & counts updated
  await neuron.promote('w-1');
  assert.equal(neuron.state.items.length, 1);
  assert.equal(neuron.state.items[0].id, 'w-2');
  assert.equal(neuron.state.counts.newCount, 1);
  assert.equal(neuron.state.counts.promotedCount, 1);

  // Dismiss w-2 -> removed from NEW view & counts updated
  await neuron.dismiss('w-2');
  assert.equal(neuron.state.items.length, 0);
  assert.equal(neuron.state.counts.newCount, 0);
  assert.equal(neuron.state.counts.dismissedCount, 1);

  // Live SSE news_item buffered & applied
  neuron.handleLiveEvent('news_item', {
    id: 'evt-live-1',
    type: 'news_item',
    timestamp: new Date().toISOString(),
    item: {
      ...streamItems[0],
      id: 'w-live-3',
      title: 'Live Breaking AI News',
      status: 'NEW',
    },
  });

  assert.equal(neuron.state.pendingLiveItems.length, 1);
  assert.equal(neuron.state.counts.newCount, 1);

  neuron.applyPendingLive();
  assert.equal(neuron.state.pendingLiveItems.length, 0);
  assert.equal(neuron.state.items.length, 1);
  assert.equal(neuron.state.items[0].id, 'w-live-3');

  // Toggle watcher enabled -> updates state.watchers reactively
  await neuron.toggleWatcher('watcher-ai', false);
  assert.equal(neuron.state.watchers[0].enabled, false);
  assert.equal(neuron.state.watchers[0].status, 'PAUSED');

  await neuron.toggleWatcher('watcher-ai', true);
  assert.equal(neuron.state.watchers[0].enabled, true);
  assert.equal(neuron.state.watchers[0].status, 'IDLE');

  // Trigger single watcher & validate/create
  const ping = await neuron.triggerWatcher('watcher-ai');
  assert.equal(ping.statusCode, 200);
  const val = await neuron.validateFeed('https://example.com/rss.xml');
  assert.equal(val.valid, true);
});
