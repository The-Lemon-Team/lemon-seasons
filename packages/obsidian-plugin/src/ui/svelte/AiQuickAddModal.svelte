<script lang="ts">
  import { onMount } from 'svelte';
  import type { App } from 'obsidian';
  import type { LentaApiClient } from '../../services/lenta-api-client';
  import type { LentaPluginSettings, ParsedNoteCard } from '../../types';
  import { createAiQuickAddStore } from './ai-quick-add-store';

  export let app: App;
  export let apiClient: LentaApiClient;
  export let settings: LentaPluginSettings;
  export let containerId: string | undefined = undefined;
  export let containerName: string | undefined = undefined;
  export let initialFolder: string | undefined = undefined;
  export let initialDate: string | undefined = undefined;
  export let onClose: () => void;
  export let onSuccess: (createdPaths: string[]) => void;

  const store = createAiQuickAddStore();
  const {
    inputText,
    isParsing,
    isSaving,
    errorMessage,
    cards,
    selectedCount,
    totalCount,
    parse,
    toggleCard,
    toggleSelectAll,
    updateCard,
    removeCard,
    addEmptyCard,
    saveSelected,
  } = store;

  // Format today's date for display: DD.MM.YY
  const today = new Date();
  const todayFormatted = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getFullYear()).slice(-2)}`;

  const promptChips = [
    {
      label: '📈 Тренды на сегодня',
      template: `Тренды ${todayFormatted}:\n- Уборка дома\n- Ремонтные работы\n- Warcraft\n- Overwatch`,
    },
    {
      label: '⏳ Тренд-период',
      template: `Тренд: Марафон Гарри Поттера 25.09.26 - 28.09.26 #кино #осень\nПапка: Trends/Cinema`,
    },
    {
      label: '📅 Событие с датой',
      template: `23.09.26 в 19:00 Митап по Svelte и TypeScript в Discord https://discord.gg/lemon #dev\nТег: tech.frontend`,
    },
    {
      label: '✅ Сделано',
      template: `Сделано сегодня: Завершил рефакторинг LentaSidebar и подключил стор. Папка: Projects/Lenta`,
    },
  ];

  function applyChip(template: string) {
    inputText.set(template);
  }

  async function handleParse() {
    const context = {
      defaultDate: initialDate || new Date().toISOString(),
      defaultFolder: initialFolder || 'Trends',
      defaultContainerId: containerId,
      defaultFeedId: 'my-notes',
    };
    await parse(apiClient, context);
  }

  async function handleSave() {
    const result = await saveSelected(app, apiClient, settings, containerId, containerName);
    if (result.success) {
      onSuccess(result.createdPaths);
      onClose();
    }
  }

  function handleTypeChange(tempId: string, event: Event) {
    const target = event.target as HTMLSelectElement;
    const val = target.value;
    if (val === 'Trend') {
      updateCard(tempId, { displayType: 'Trend' });
    } else {
      updateCard(tempId, { type: val as any, displayType: val });
    }
  }
</script>

<div class="ai-quick-add-container">
  <!-- Header -->
  <div class="modal-header">
    <div class="title-row">
      <span class="sparkle-badge">✨ AI ЧАТ</span>
      <h2>Быстрое добавление карточек</h2>
    </div>
    <p class="subtitle">
      Введите произвольный текст, список трендов или события. AI структурирует их в карточки с автоматической датой, фидом и папками.
    </p>
  </div>

  <!-- Prompt Chips -->
  <div class="chips-container">
    <span class="chips-label">Шаблоны:</span>
    {#each promptChips as chip}
      <button
        type="button"
        class="chip-button"
        on:click={() => applyChip(chip.template)}
        disabled={$isParsing || $isSaving}
      >
        {chip.label}
      </button>
    {/each}
  </div>

  <!-- Text Input Area -->
  <div class="input-section">
    <textarea
      class="text-input"
      rows="6"
      placeholder={`Пример:\nТренды ${todayFormatted}:\n- Уборка дома\n- Ремонтные работы\n- Warcraft #игры`}
      bind:value={$inputText}
      disabled={$isParsing || $isSaving}
    ></textarea>

    <div class="parse-action-row">
      <button
        type="button"
        class="parse-button"
        on:click={handleParse}
        disabled={$isParsing || $isSaving || !$inputText.trim()}
      >
        {#if $isParsing}
          <span class="spinner"></span> Распознавание...
        {:else}
          ✨ Сгенерировать карточки
        {/if}
      </button>
    </div>
  </div>

  <!-- Error Message -->
  {#if $errorMessage}
    <div class="error-banner">
      ⚠️ {$errorMessage}
    </div>
  {/if}

  <!-- Cards Preview Section -->
  {#if $cards.length > 0}
    <div class="cards-section">
      <div class="cards-header">
        <div class="selection-controls">
          <label class="select-all-label">
            <input
              type="checkbox"
              checked={$selectedCount === $totalCount && $totalCount > 0}
              on:change={(e) => toggleSelectAll(e.currentTarget.checked)}
            />
            <span>Выбрать все ({$selectedCount} из {$totalCount})</span>
          </label>
        </div>

        <button
          type="button"
          class="add-card-btn"
          on:click={() => addEmptyCard(initialDate, initialFolder)}
        >
          + Добавить карточку
        </button>
      </div>

      <div class="cards-scroll-list">
        {#each $cards as card (card.tempId)}
          <div class="card-item" class:is-selected={card.selected} class:is-trend={card.displayType === 'Trend'}>
            <!-- Checkbox -->
            <div class="card-select">
              <input
                type="checkbox"
                checked={card.selected}
                on:change={() => toggleCard(card.tempId)}
              />
            </div>

            <!-- Card Body -->
            <div class="card-content">
              <!-- Row 1: Type Selector & Title -->
              <div class="card-row title-row">
                <select
                  class="type-select"
                  class:badge-trend={card.displayType === 'Trend'}
                  value={card.displayType === 'Trend' ? 'Trend' : card.type}
                  on:change={(e) => handleTypeChange(card.tempId, e)}
                >
                  <option value="Trend">📈 Trend</option>
                  <option value="SINGLE">📝 Point Note</option>
                  <option value="PERIOD">⏳ Period</option>
                  <option value="EVENT">📅 Event</option>
                  <option value="DONE">✅ Done</option>
                  <option value="FILM_RELEASE">🎬 Release</option>
                </select>

                <input
                  type="text"
                  class="title-input"
                  placeholder="Название карточки"
                  value={card.title}
                  on:input={(e) => updateCard(card.tempId, { title: e.currentTarget.value })}
                />

                <button
                  type="button"
                  class="delete-card-btn"
                  title="Удалить карточку"
                  on:click={() => removeCard(card.tempId)}
                >
                  ✕
                </button>
              </div>

              <!-- Row 2: Dates, Folder, Feed -->
              <div class="card-row meta-row">
                <div class="meta-field">
                  <span class="meta-icon">📅</span>
                  <input
                    type="date"
                    class="date-input"
                    value={card.startDate ? card.startDate.split('T')[0] : ''}
                    on:change={(e) => updateCard(card.tempId, { startDate: e.currentTarget.value })}
                  />
                </div>

                {#if card.type === 'PERIOD' || card.endDate}
                  <div class="meta-field">
                    <span class="meta-label">—</span>
                    <input
                      type="date"
                      class="date-input"
                      value={card.endDate ? card.endDate.split('T')[0] : ''}
                      on:change={(e) => updateCard(card.tempId, { endDate: e.currentTarget.value })}
                    />
                  </div>
                {/if}

                <div class="meta-field flex-1">
                  <span class="meta-icon">📁</span>
                  <input
                    type="text"
                    class="folder-input"
                    placeholder="Папка (Trends, Notes...)"
                    value={card.folder || ''}
                    on:input={(e) => updateCard(card.tempId, { folder: e.currentTarget.value })}
                  />
                </div>

                <div class="meta-field flex-1">
                  <span class="meta-icon">🏷️</span>
                  <input
                    type="text"
                    class="tags-input"
                    placeholder="Хэштеги (#тренд, #игры)"
                    value={(card.hashtags || []).map((h) => `#${h}`).join(' ')}
                    on:input={(e) => {
                      const tags = (e.currentTarget.value.match(/#([\wа-яА-ЯёЁ_-]+)/g) || []).map((h) => h.replace(/^#/, ''));
                      updateCard(card.tempId, { hashtags: tags });
                    }}
                  />
                </div>
              </div>

              <!-- Row 3: Optional Source Link or Taxonomy -->
              {#if card.sourceLink || card.taxonomyPath}
                <div class="card-row extra-row">
                  {#if card.sourceLink}
                    <div class="extra-field">
                      <span class="extra-label">🔗 Ссылка:</span>
                      <a href={card.sourceLink} target="_blank" class="source-link">{card.sourceLink}</a>
                    </div>
                  {/if}
                  {#if card.taxonomyPath}
                    <div class="extra-field">
                      <span class="extra-label">Категория:</span>
                      <span class="tax-badge">{card.taxonomyPath}</span>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Footer Actions -->
  <div class="modal-footer">
    <button type="button" class="btn-cancel" on:click={onClose} disabled={$isSaving}>
      Отмена
    </button>

    <button
      type="button"
      class="btn-save"
      on:click={handleSave}
      disabled={$isSaving || $selectedCount === 0}
    >
      {#if $isSaving}
        <span class="spinner"></span> Сохранение...
      {:else}
        ✨ Добавить выбранные ({$selectedCount})
      {/if}
    </button>
  </div>
</div>

<style>
  .ai-quick-add-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 8px 4px;
    max-height: 82vh;
    box-sizing: border-box;
  }

  .modal-header h2 {
    margin: 4px 0 2px 0;
    font-size: 1.35rem;
    font-weight: 700;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .sparkle-badge {
    background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
    color: #ffffff;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 12px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .subtitle {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .chips-container {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
  }

  .chips-label {
    font-size: 0.8rem;
    color: var(--text-muted);
    font-weight: 600;
  }

  .chip-button {
    background: var(--background-secondary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 14px;
    font-size: 0.78rem;
    padding: 3px 10px;
    cursor: pointer;
    color: var(--text-normal);
    transition: all 0.15s ease;
  }

  .chip-button:hover:not(:disabled) {
    border-color: var(--interactive-accent);
    color: var(--interactive-accent);
    background: var(--background-secondary-alt);
  }

  .input-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .text-input {
    width: 100%;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    padding: 10px 12px;
    font-family: inherit;
    font-size: 0.9rem;
    color: var(--text-normal);
    resize: vertical;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }

  .text-input:focus {
    outline: none;
    border-color: var(--interactive-accent);
    box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.2);
  }

  .parse-action-row {
    display: flex;
    justify-content: flex-end;
  }

  .parse-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%);
    color: white;
    font-weight: 600;
    padding: 8px 18px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 0.88rem;
    transition: transform 0.15s, opacity 0.15s;
  }

  .parse-button:hover:not(:disabled) {
    transform: translateY(-1px);
    opacity: 0.95;
  }

  .parse-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error-banner {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.85rem;
  }

  .cards-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
  }

  .cards-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 2px;
  }

  .select-all-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }

  .add-card-btn {
    background: none;
    border: 1px dashed var(--background-modifier-border);
    color: var(--text-muted);
    border-radius: 6px;
    padding: 3px 10px;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .add-card-btn:hover {
    color: var(--text-normal);
    border-color: var(--text-muted);
  }

  .cards-scroll-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 42vh;
    overflow-y: auto;
    padding-right: 4px;
  }

  .card-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: var(--background-secondary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    padding: 10px 12px;
    transition: border-color 0.15s, background-color 0.15s;
  }

  .card-item.is-selected {
    border-color: rgba(168, 85, 247, 0.4);
    background: var(--background-secondary-alt);
  }

  .card-item.is-trend {
    border-left: 3px solid #a855f7;
  }

  .card-select {
    padding-top: 4px;
  }

  .card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .card-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .type-select {
    font-size: 0.78rem;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: 6px;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    color: var(--text-normal);
    cursor: pointer;
  }

  .badge-trend {
    color: #c084fc;
    border-color: #a855f7;
  }

  .title-input {
    flex: 1;
    font-weight: 600;
    font-size: 0.95rem;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    padding: 4px 8px;
    color: var(--text-normal);
  }

  .title-input:focus {
    outline: none;
    border-color: var(--interactive-accent);
  }

  .delete-card-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 0.9rem;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .delete-card-btn:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }

  .meta-row {
    font-size: 0.8rem;
  }

  .meta-field {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    padding: 2px 6px;
  }

  .meta-icon {
    font-size: 0.8rem;
  }

  .date-input,
  .folder-input,
  .tags-input {
    background: transparent;
    border: none;
    font-size: 0.8rem;
    color: var(--text-normal);
    outline: none;
    width: 100%;
  }

  .flex-1 {
    flex: 1;
    min-width: 120px;
  }

  .extra-row {
    font-size: 0.78rem;
    color: var(--text-muted);
  }

  .source-link {
    color: var(--text-accent);
    text-decoration: none;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tax-badge {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    padding: 1px 6px;
    border-radius: 4px;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
    padding-top: 12px;
    border-top: 1px solid var(--background-modifier-border);
  }

  .btn-cancel {
    background: var(--background-secondary);
    border: 1px solid var(--background-modifier-border);
    color: var(--text-muted);
    padding: 7px 16px;
    border-radius: 6px;
    cursor: pointer;
  }

  .btn-cancel:hover {
    color: var(--text-normal);
  }

  .btn-save {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    font-weight: 600;
    padding: 7px 18px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn-save:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn-save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
