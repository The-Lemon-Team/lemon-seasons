import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SeasonsApiClient,
  SeasonsSseBus,
  TopologyNeuron,
  FeedNeuron,
  CodingMemoryAxon,
  CharacterDialogueAxon,
  cloudDayNoteToIngestInput,
  seasonNoteToCloudDayNote,
} from '../dist/index.js';

function createMockFetch(handler) {
  return async (url, init) => {
    const result = await handler(String(url), init);
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => result,
      text: async () => JSON.stringify(result),
    };
  };
}

test('TopologyNeuron: applies authoritative server TOPOLOGY_PATCH and self-heals on revision gap', async () => {
  let fetchCount = 0;
  const apiClient = new SeasonsApiClient({
    baseUrl: 'http://localhost:3009',
    token: 'admin-demo-token',
    fetchImpl: createMockFetch(async () => {
      fetchCount += 1;
      const rev = fetchCount === 1 ? 10 : 15;
      return {
        revision: rev,
        syncCursor: { revision: rev, lastEventId: `evt-${rev}`, serverTime: '2026-11-08T10:00:00Z' },
        contour: 'admin',
        totals: { streams: 1, feeds: 1, notes: rev === 10 ? 5 : 9, activePeriods: 0 },
        streams: [
          {
            id: 's1',
            slug: 'lemon-party',
            title: 'Lemon Party',
            privacy: 'public',
            totalNotes: rev === 10 ? 5 : 9,
            upcomingCount: 0,
            tabs: [{ id: 'f1', slug: 'party-chrono-diary', label: 'Diary', type: 'feed', count: rev === 10 ? 5 : 9 }],
            subtopics: [],
          },
        ],
        feeds: [
          {
            id: 'f1',
            slug: 'party-chrono-diary',
            title: 'Diary',
            privacy: 'public',
            totalNotes: rev === 10 ? 5 : 9,
            publishedNotes: rev === 10 ? 5 : 9,
            stagingNotes: 0,
            byType: { SINGLE: rev === 10 ? 5 : 9 },
            streamSlugs: ['lemon-party'],
          },
        ],
        facets: {
          dateBuckets: [{ dateKey: '2026-11-08', count: rev === 10 ? 5 : 9 }],
          authors: [{ author: 'hero-lemon', count: rev === 10 ? 5 : 9 }],
          hashtags: [{ name: 'party:thought', count: rev === 10 ? 5 : 9 }],
          activePeriods: [],
        },
      };
    }),
  });

  const sseBus = new SeasonsSseBus({ baseUrl: 'http://localhost:3009', token: 'admin-demo-token' });
  const topology = new TopologyNeuron({ apiClient, sseBus });
  await topology.initialize();

  assert.equal(topology.getSnapshot().revision, 10);
  assert.equal(topology.getSnapshot().feeds[0].totalNotes, 5);

  // 1. Sequential patch (10 -> 11): applied directly without HTTP refetch
  sseBus.emitPacket({
    kind: 'topology',
    patch: {
      type: 'TOPOLOGY_PATCH',
      revision: 11,
      previousRevision: 10,
      timestamp: Date.now(),
      reason: 'NOTE_CREATED',
      totals: { streams: 1, feeds: 1, notes: 6, activePeriods: 0 },
      feeds: {
        'party-chrono-diary': {
          totalNotes: 6,
          publishedNotes: 6,
          stagingNotes: 0,
          byType: { SINGLE: 6 },
        },
      },
      dateBuckets: { '2026-11-08': 6 },
      authors: { 'hero-lemon': 6 },
    },
  });

  assert.equal(fetchCount, 1);
  assert.equal(topology.getSnapshot().revision, 11);
  assert.equal(topology.getSnapshot().feeds[0].totalNotes, 6);
  assert.equal(topology.getSnapshot().facets.dateBuckets[0].count, 6);

  // 2. Revision gap (current 11, patch expects previousRevision 14 -> revision 15): triggers self-healing HTTP snapshot sync
  sseBus.emitPacket({
    kind: 'topology',
    patch: {
      type: 'TOPOLOGY_PATCH',
      revision: 15,
      previousRevision: 14,
      timestamp: Date.now(),
      reason: 'BATCH_SYNC',
    },
  });

  await new Promise((r) => setTimeout(r, 25));
  assert.equal(fetchCount, 2);
  assert.equal(topology.getSnapshot().revision, 15);
  assert.equal(topology.getSnapshot().feeds[0].totalNotes, 9);

  topology.destroy();
});

test('FeedNeuron: loads paginated pages and reconciles NOTE_CREATED and NOTE_LEFT impulses', async () => {
  const apiClient = new SeasonsApiClient({
    baseUrl: 'http://localhost:3009',
    fetchImpl: createMockFetch(async (url) => {
      assert.ok(url.includes('/api/v1/feeds/party-chrono-diary/notes'));
      return {
        total: 2,
        limit: 20,
        offset: 0,
        items: [
          { id: 'n-2', title: 'Second Thought' },
          { id: 'n-1', title: 'First Thought' },
        ],
      };
    }),
  });

  const sseBus = new SeasonsSseBus({ baseUrl: 'http://localhost:3009' });
  const feedNeuron = new FeedNeuron({
    feedSlug: 'party-chrono-diary',
    apiClient,
    sseBus,
    pageSize: 20,
  });

  await feedNeuron.connect();
  assert.equal(feedNeuron.value.items.length, 2);

  // Live note created in this feed
  sseBus.emitPacket({
    kind: 'note',
    event: {
      id: 'evt-101',
      type: 'NOTE_CREATED',
      noteId: 'n-3',
      title: 'Third Thought',
      feedSlug: 'party-chrono-diary',
      privacy: 'public',
      timestamp: Date.now(),
      note: { id: 'n-3', title: 'Third Thought' },
    },
  });

  assert.equal(feedNeuron.value.items.length, 3);
  assert.equal(feedNeuron.value.items[0].id, 'n-3');

  // Note n-2 moved to another feed -> NOTE_LEFT removes it cleanly from this FeedNeuron!
  sseBus.emitPacket({
    kind: 'note',
    event: {
      id: 'evt-102',
      type: 'NOTE_LEFT',
      noteId: 'n-2',
      title: 'Second Thought',
      feedSlug: 'archive-feed',
      previousFeedSlug: 'party-chrono-diary',
      privacy: 'private',
      timestamp: Date.now(),
    },
  });

  assert.equal(feedNeuron.value.items.length, 2);
  assert.deepEqual(
    feedNeuron.value.items.map((n) => n.id),
    ['n-3', 'n-1'],
  );

  feedNeuron.disconnect();
});

test('LemonParty Mapper & CodingMemoryAxon: roundtrip binary privacy and NoteOrigin', async () => {
  const cloudNote = {
    id: 'cn-42',
    dateKey: '2026-11-08',
    time: '14:30',
    createdAt: '2026-11-08T14:30:00Z',
    type: 'proposal',
    text: 'Давайте вынесем шину событий в независимый пакет @lenta/lemon-bus!',
    actorId: 'earl-lemongrab',
    actorName: 'Earl of Lemongrab',
    visibility: 'GM_ONLY',
    replyToNoteId: 'note-parent-1',
    moodEmoji: '🍋',
    votesCount: 7,
  };

  const ingestPayload = cloudDayNoteToIngestInput(cloudNote);
  assert.equal(ingestPayload.privacy, 'private'); // Binary privacy preserved!
  assert.equal(ingestPayload.origin, 'NEURON_PARTY');
  assert.equal(ingestPayload.type, 'EVENT');
  assert.equal(ingestPayload.parentNoteId, 'note-parent-1');
  assert.equal(ingestPayload.metadata.visibilityTier, 'GM_ONLY');

  const reconstructed = seasonNoteToCloudDayNote({
    id: 'season-uuid-99',
    title: ingestPayload.title,
    content: ingestPayload.content,
    type: ingestPayload.type,
    privacy: ingestPayload.privacy,
    author: ingestPayload.author,
    parentNoteId: ingestPayload.parentNoteId,
    startDate: ingestPayload.startDate,
    metadata: ingestPayload.metadata,
  });

  assert.equal(reconstructed.id, 'cn-42');
  assert.equal(reconstructed.visibility, 'GM_ONLY');
  assert.equal(reconstructed.type, 'proposal');
  assert.equal(reconstructed.replyToNoteId, 'note-parent-1');

  let capturedIngest = null;
  const apiClient = new SeasonsApiClient({
    baseUrl: 'http://localhost:3009',
    fetchImpl: createMockFetch(async (_url, init) => {
      capturedIngest = JSON.parse(init.body);
      return {
        success: true,
        action: 'CREATED',
        isNew: true,
        noteId: 'mem-1',
        note: { id: 'mem-1', ...capturedIngest },
      };
    }),
  });

  const axon = new CodingMemoryAxon({ apiClient });
  const res = await axon.commitSessionChangelog({
    sessionId: 'sess-2026-11-08',
    repoName: 'lemon-calendarium',
    title: 'Implemented @lenta/lemon-bus and @lenta/seasons-neurons',
    summaryMarkdown: 'Extracted bus transport and authoritative server topology.',
    startedAt: '2026-11-08T09:00:00Z',
    endedAt: '2026-11-08T11:30:00Z',
    decisions: ['Zero client counter math', 'Binary privacy'],
  });

  assert.equal(res.noteId, 'mem-1');
  assert.equal(capturedIngest.origin, 'CODING_AGENT');
  assert.equal(capturedIngest.type, 'DONE');
});

test('FeedNeuron: live impulse updates and fast switching between feeds', async () => {
  const feedStores = {
    crypto: [{ id: 'c1', title: 'Bitcoin Note' }],
    ai: [{ id: 'a1', title: 'LLM Reasoning Note' }],
  };

  const apiClient = new SeasonsApiClient({
    baseUrl: 'http://localhost:3009',
    fetchImpl: createMockFetch(async (url) => {
      if (url.includes('/feeds/crypto/notes')) {
        return {
          total: feedStores.crypto.length,
          limit: 30,
          offset: 0,
          hasMore: false,
          items: feedStores.crypto,
        };
      }
      if (url.includes('/feeds/ai/notes')) {
        return {
          total: feedStores.ai.length,
          limit: 30,
          offset: 0,
          hasMore: false,
          items: feedStores.ai,
        };
      }
      return { total: 0, limit: 30, offset: 0, hasMore: false, items: [] };
    }),
  });

  const sseBus = new SeasonsSseBus({ baseUrl: 'http://localhost:3009' });
  const neuron = new FeedNeuron({ feedSlug: 'crypto', apiClient, sseBus });

  // 1. Initial connect to 'crypto'
  const cryptoState = await neuron.connect();
  assert.equal(cryptoState.feedSlug, 'crypto');
  assert.equal(cryptoState.total, 1);
  assert.equal(cryptoState.items[0].title, 'Bitcoin Note');

  // 2. Live impulse arrives for 'crypto'
  sseBus.emitPacket({
    kind: 'note',
    event: {
      id: 'evt-c2',
      type: 'NOTE_CREATED',
      feedSlug: 'crypto',
      noteId: 'c2',
      note: { id: 'c2', title: 'Ethereum Staking Note' },
    },
  });

  assert.equal(neuron.value.total, 2);
  assert.equal(neuron.value.items[0].id, 'c2');
  assert.equal(neuron.value.items[0].title, 'Ethereum Staking Note');

  // 3. Fast switch from 'crypto' to 'ai'
  const aiState = await neuron.switchFeed('ai');
  assert.equal(aiState.feedSlug, 'ai');
  assert.equal(aiState.total, 1);
  assert.equal(aiState.items[0].title, 'LLM Reasoning Note');

  // 4. Now emit an impulse for 'crypto' — neuron is on 'ai', so it MUST IGNORE it!
  sseBus.emitPacket({
    kind: 'note',
    event: {
      id: 'evt-c3',
      type: 'NOTE_CREATED',
      feedSlug: 'crypto',
      noteId: 'c3',
      note: { id: 'c3', title: 'Solana Speed Note' },
    },
  });

  // State on 'ai' remains unaffected!
  assert.equal(neuron.value.feedSlug, 'ai');
  assert.equal(neuron.value.total, 1);
  assert.equal(neuron.value.items[0].title, 'LLM Reasoning Note');

  // 5. Emit impulse for 'ai' — neuron processes it immediately
  sseBus.emitPacket({
    kind: 'note',
    event: {
      id: 'evt-a2',
      type: 'NOTE_CREATED',
      feedSlug: 'ai',
      noteId: 'a2',
      note: { id: 'a2', title: 'Claude 3.7 Sonnet Deep Dive' },
    },
  });

  assert.equal(neuron.value.total, 2);
  assert.equal(neuron.value.items[0].id, 'a2');
  assert.equal(neuron.value.items[0].title, 'Claude 3.7 Sonnet Deep Dive');

  neuron.disconnect();
});

test('CharacterDialogueAxon: ensures character stream/feed, records dialogue turn, and queries day timeline', async () => {
  const capturedRequests = [];
  const storedNotes = [];

  const apiClient = new SeasonsApiClient({
    baseUrl: 'http://localhost:3009',
    fetchImpl: createMockFetch(async (url, init) => {
      capturedRequests.push({ url, method: init?.method || 'GET', body: init?.body ? JSON.parse(init.body) : null });

      // Streams mock
      if (url.includes('/api/v1/streams') && init?.method === 'POST') {
        const body = JSON.parse(init.body);
        return { id: 'stream-party-id', slug: body.slug, title: body.title };
      }
      if (url.includes('/api/v1/streams/')) {
        throw new Error('Stream not found, trigger POST');
      }

      // Feeds mock
      if (url.includes('/api/v1/feeds') && init?.method === 'POST') {
        const body = JSON.parse(init.body);
        return { id: 'feed-actor-id', slug: body.slug, title: body.title };
      }
      if (url.includes('/api/v1/feeds/')) {
        throw new Error('Feed not found yet, trigger POST');
      }

      // Notes ingest mock
      if (url.includes('/api/v1/notes/ingest')) {
        const body = JSON.parse(init.body);
        const saved = { id: `party-note-${Date.now()}`, ...body };
        storedNotes.push(saved);
        return { success: true, action: 'CREATED', isNew: true, noteId: saved.id, note: saved };
      }

      // Notes page query mock
      if (url.includes('/api/v1/notes?')) {
        return {
          total: storedNotes.length,
          limit: 100,
          offset: 0,
          items: storedNotes,
        };
      }

      return {};
    }),
  });

  const sseBus = new SeasonsSseBus({ baseUrl: 'http://localhost:3009' });
  const axon = new CharacterDialogueAxon({ apiClient, sseBus, defaultStreamSlug: 'lemon-party' });

  // 1. Ensure character channel registers parent stream and character feed
  const channel = await axon.ensureCharacterChannel({
    actorId: 'alisa-sage',
    actorName: 'Алиса Мудрая',
    actorAvatar: '🔮',
    actorTitle: 'Архивариус и аналитик',
  });

  assert.equal(channel.streamSlug, 'lemon-party');
  assert.equal(channel.feedSlug, 'party-alisa-sage');

  // Verify stream POST was issued
  const streamPost = capturedRequests.find((r) => r.url.endsWith('/api/v1/streams') && r.method === 'POST');
  assert.ok(streamPost, 'Expected stream creation POST request');
  assert.equal(streamPost.body.slug, 'lemon-party');

  // 2. Record dialogue message
  const liveReceived = [];
  const sub = axon.streamLiveDialogue$('alisa-sage').subscribe((note) => {
    liveReceived.push(note);
  });

  const recordedNote = await axon.recordDialogue({
    actorId: 'alisa-sage',
    actorName: 'Алиса Мудрая',
    actorAvatar: '🔮',
    text: 'Сегодня мы связали потоки мыслей персонажей с хронологическим таймлайном Lemon Seasons!',
    type: 'thought',
    dateKey: '2026-11-08',
    time: '22:30',
    moodEmoji: '✨',
    tags: ['ai-philosophy', 'timeline-sync'],
  });

  assert.equal(recordedNote.actorId, 'alisa-sage');
  assert.equal(recordedNote.dateKey, '2026-11-08');
  assert.equal(recordedNote.time, '22:30');
  assert.equal(recordedNote.type, 'thought');
  assert.equal(recordedNote.visibility, 'PUBLIC');

  // Verify Ingest payload had origin = 'NEURON_PARTY'
  const ingestReq = capturedRequests.find((r) => r.url.includes('/api/v1/notes/ingest'));
  assert.ok(ingestReq, 'Expected notes/ingest request');
  assert.equal(ingestReq.body.origin, 'NEURON_PARTY');
  assert.equal(ingestReq.body.privacy, 'public');

  // 3. Query Day Timeline
  const timelineNotes = await axon.getDayTimeline('2026-11-08', { streamSlug: 'lemon-party' });
  assert.equal(timelineNotes.length, 1);
  assert.equal(timelineNotes[0].actorName, 'Алиса Мудрая');
  assert.equal(timelineNotes[0].dateKey, '2026-11-08');

  // 4. Live impulse received via streamLiveDialogue$
  sseBus.emitPacket({
    kind: 'note',
    event: {
      id: 'evt-dialogue-1',
      type: 'NOTE_CREATED',
      title: 'Алиса Мудрая: Ответ на реплику',
      summary: 'Ответ на реплику',
      author: 'alisa-sage',
      feedSlug: 'party-alisa-sage',
      privacy: 'public',
      timestamp: Date.now(),
      note: {
        id: 'note-live-1',
        content: 'Парящие облачка оживают!',
        metadata: { actorId: 'alisa-sage', actorName: 'Алиса Мудрая', dateKey: '2026-11-08', time: '22:32' },
      },
    },
  });

  assert.equal(liveReceived.length, 1);
  assert.equal(liveReceived[0].actorId, 'alisa-sage');
  assert.equal(liveReceived[0].text, 'Парящие облачка оживают!');

  sub.unsubscribe();
});


