import test from 'node:test';
import assert from 'node:assert/strict';
import { ModerationApiClient, ModerationNeuron } from '../dist/index.js';

test('ModerationNeuron: reactive state management, approve, reject, and SSE impulses', async () => {
  let mockItems = [
    {
      id: 'mod-1',
      title: 'First Pending Note',
      summary: 'Summary 1',
      feedSlug: 'spark-ai',
      category: 'ai',
      status: 'PENDING',
      privacy: 'public',
      origin: 'CODING_AGENT',
      hashtags: ['ai'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {},
      deviceId: 'test-device',
      type: 'SINGLE',
    },
    {
      id: 'mod-2',
      title: 'Second Pending Note',
      summary: 'Summary 2',
      feedSlug: 'spark-tech',
      category: 'tech',
      status: 'PENDING',
      privacy: 'public',
      origin: 'CODING_AGENT',
      hashtags: ['tech'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {},
      deviceId: 'test-device',
      type: 'SINGLE',
    },
  ];

  const mockClient = {
    baseUrl: 'http://localhost:3030',
    async getStats() {
      return {
        totalCount: mockItems.length,
        pendingCount: mockItems.filter((i) => i.status === 'PENDING').length,
        approvedCount: mockItems.filter((i) => i.status === 'APPROVED').length,
        rejectedCount: mockItems.filter((i) => i.status === 'REJECTED').length,
      };
    },
    async queryItems(query) {
      const filtered = mockItems.filter((i) => (query.status ? i.status === query.status : true));
      return {
        items: filtered,
        total: filtered.length,
        limit: query.limit || 30,
        offset: query.offset || 0,
        hasMore: false,
      };
    },
    async approveItem(id, overrides, moderatorId) {
      const item = mockItems.find((i) => i.id === id);
      if (!item) throw new Error('Not found');
      item.status = 'APPROVED';
      item.moderatedBy = moderatorId;
      return {
        ok: true,
        action: 'APPROVED',
        item,
        publishedEvent: { eventId: 'evt-appr-1', entityType: 'NOTE', action: 'UPSERT', payload: item },
      };
    },
    async rejectItem(id, reason, moderatorId) {
      const item = mockItems.find((i) => i.id === id);
      if (!item) throw new Error('Not found');
      item.status = 'REJECTED';
      item.rejectReason = reason;
      item.moderatedBy = moderatorId;
      return {
        ok: true,
        action: 'REJECTED',
        item,
      };
    },
    async updateItem(id, patch) {
      const item = mockItems.find((i) => i.id === id);
      if (!item) throw new Error('Not found');
      Object.assign(item, patch);
      return { ok: true, item };
    },
    async batchApprove(ids, moderatorId) {
      for (const id of ids) {
        await this.approveItem(id, undefined, moderatorId);
      }
      return { ok: true, processedCount: ids.length, failedCount: 0, items: [] };
    },
    async batchReject(ids, reason, moderatorId) {
      for (const id of ids) {
        await this.rejectItem(id, reason, moderatorId);
      }
      return { ok: true, processedCount: ids.length, failedCount: 0, items: [] };
    },
    async importWatcherItems(limit) {
      return { ok: true, imported: 0, skipped: 0 };
    },
  };

  const neuron = new ModerationNeuron({
    apiClient: mockClient,
  });

  // 1. Load initial page
  const initialState = await neuron.loadInitial();
  assert.equal(initialState.items.length, 2);
  assert.equal(initialState.total, 2);
  assert.equal(initialState.stats?.pendingCount, 2);

  // 2. Approve item mod-1
  const approveRes = await neuron.approve('mod-1', undefined, 'curator-bob');
  assert.equal(approveRes.ok, true);
  assert.equal(neuron.state.items.length, 1);
  assert.equal(neuron.state.items[0].id, 'mod-2');
  assert.equal(neuron.state.total, 1);
  assert.equal(neuron.state.stats?.pendingCount, 1);
  assert.equal(neuron.state.stats?.approvedCount, 1);

  // 3. Reject item mod-2
  const rejectRes = await neuron.reject('mod-2', 'Irrelevant news', 'curator-bob');
  assert.equal(rejectRes.ok, true);
  assert.equal(neuron.state.items.length, 0);
  assert.equal(neuron.state.total, 0);
  assert.equal(neuron.state.stats?.pendingCount, 0);
  assert.equal(neuron.state.stats?.rejectedCount, 1);

  // 4. Handle live SSE impulse (MODERATION_ITEM_ADDED)
  neuron.handleImpulse({
    type: 'MODERATION_ITEM_ADDED',
    item: {
      id: 'mod-live-3',
      title: 'Incoming Breaking News via SSE',
      feedSlug: 'spark-ai',
      status: 'PENDING',
      privacy: 'public',
      origin: 'CODING_AGENT',
      hashtags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {},
      deviceId: 'stream-node',
      type: 'SINGLE',
    },
  });

  assert.equal(neuron.state.items.length, 1);
  assert.equal(neuron.state.items[0].id, 'mod-live-3');
  assert.equal(neuron.state.total, 1);
  assert.equal(neuron.state.stats?.pendingCount, 1);
});
