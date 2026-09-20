import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { createAiQuickAddStore } from '../svelte/ai-quick-add-store';
import { resolveTrendNoteType } from '@lenta/shared';

describe('AI Quick Add Store & Trend Logic', () => {
  let mockApiClient: any;
  let mockApp: any;
  let mockSettings: any;

  beforeEach(() => {
    mockApiClient = {
      parseAiNotes: vi.fn().mockResolvedValue({
        cards: [
          {
            tempId: 'temp-1',
            title: 'Уборка дома',
            type: 'SINGLE',
            displayType: 'Trend',
            startDate: '2026-09-22T12:00:00.000Z',
            endDate: null,
            feedSlug: 'my-notes',
            folder: 'Trends',
            hashtags: ['тренд'],
          },
          {
            tempId: 'temp-2',
            title: 'Марафон Гарри Поттера',
            type: 'PERIOD',
            displayType: 'Trend',
            startDate: '2026-09-25T00:00:00.000Z',
            endDate: '2026-09-28T23:59:59.000Z',
            feedSlug: 'films',
            folder: 'Trends/Cinema',
            hashtags: ['тренд', 'кино'],
          },
        ],
      }),
      createNotesBatch: vi.fn().mockResolvedValue({
        createdCount: 2,
        notes: [
          {
            id: 'n-1',
            title: 'Уборка дома',
            type: 'SINGLE',
            startDate: '2026-09-22T12:00:00.000Z',
            folders: [{ folder: { path: 'Trends' } }],
          },
          {
            id: 'n-2',
            title: 'Марафон Гарри Поттера',
            type: 'PERIOD',
            startDate: '2026-09-25T00:00:00.000Z',
            endDate: '2026-09-28T23:59:59.000Z',
            folders: [{ folder: { path: 'Trends/Cinema' } }],
          },
        ],
      }),
    };

    mockApp = {
      vault: {
        getAbstractFileByPath: vi.fn().mockReturnValue(null),
        createFolder: vi.fn().mockResolvedValue(undefined),
        create: vi.fn().mockResolvedValue({ path: 'Lenta/Trends/Уборка дома.md' }),
      },
    };

    mockSettings = {
      vaultRootFolder: 'Lenta',
    };
  });

  it('correctly resolves Trend physical note type as SINGLE or PERIOD', () => {
    expect(resolveTrendNoteType(null)).toBe('SINGLE');
    expect(resolveTrendNoteType(undefined)).toBe('SINGLE');
    expect(resolveTrendNoteType('')).toBe('SINGLE');
    expect(resolveTrendNoteType('2026-09-28T23:59:59.000Z')).toBe('PERIOD');
  });

  it('parses text and populates cards store', async () => {
    const store = createAiQuickAddStore();
    store.inputText.set('Тренды 22.09.26:\n- Уборка дома\n- Марафон Гарри Поттера');

    await store.parse(mockApiClient);

    const cards = get(store.cards);
    expect(cards).toHaveLength(2);
    expect(cards[0].title).toBe('Уборка дома');
    expect(cards[0].displayType).toBe('Trend');
    expect(cards[0].selected).toBe(true);

    expect(cards[1].title).toBe('Марафон Гарри Поттера');
    expect(cards[1].displayType).toBe('Trend');
    expect(cards[1].type).toBe('PERIOD');

    expect(get(store.selectedCount)).toBe(2);
  });

  it('supports toggling individual cards and select all', async () => {
    const store = createAiQuickAddStore();
    store.inputText.set('Dummy text');
    await store.parse(mockApiClient);

    // Toggle card 1
    store.toggleCard('temp-1');
    expect(get(store.cards)[0].selected).toBe(false);
    expect(get(store.selectedCount)).toBe(1);

    // Toggle select all off
    store.toggleSelectAll(false);
    expect(get(store.selectedCount)).toBe(0);

    // Toggle select all on
    store.toggleSelectAll(true);
    expect(get(store.selectedCount)).toBe(2);
  });

  it('updates card properties and aligns Trend note type', async () => {
    const store = createAiQuickAddStore();
    store.inputText.set('Dummy text');
    await store.parse(mockApiClient);

    // Add end date to card 1 and mark as Trend -> should switch type to PERIOD
    store.updateCard('temp-1', {
      endDate: '2026-09-24T23:59:59.000Z',
      displayType: 'Trend',
    });

    const updatedCard = get(store.cards)[0];
    expect(updatedCard.type).toBe('PERIOD');
    expect(updatedCard.hashtags).toContain('тренд');
  });

  it('saves selected cards via batch API and creates local vault files', async () => {
    const store = createAiQuickAddStore();
    store.inputText.set('Dummy text');
    await store.parse(mockApiClient);

    const res = await store.saveSelected(mockApp, mockApiClient, mockSettings);
    expect(res.success).toBe(true);
    expect(mockApiClient.createNotesBatch).toHaveBeenCalledTimes(1);
    expect(mockApp.vault.create).toHaveBeenCalledTimes(2);
  });
});
