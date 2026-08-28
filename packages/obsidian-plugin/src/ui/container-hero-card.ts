import { App, Notice } from 'obsidian';
import { LentaContainerSummaryDto, LentaFolderDto, LentaPluginSettings } from '../types';
import { isContainerPublic } from '../utils/container-privacy';
import { getContainerDisplayTitle } from '../utils/container-title';
import { ChangedLentaFile } from '../services/changed-files-scanner';

export interface ContainerHeroCardOptions {
  app: App;
  settings: LentaPluginSettings;
  changedFiles?: ChangedLentaFile[];
  folders?: LentaFolderDto[];
  onPushPending?: () => Promise<void>;
  onRefresh?: () => Promise<void>;
}

/**
 * Format timestamp into human readable relative string (e.g. "10m ago", "2h ago")
 */
function formatRelativeTime(timestamp: number | string): string {
  const timeMs = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  if (!timeMs || isNaN(timeMs)) return 'Recently';
  const diffSec = Math.floor((Date.now() - timeMs) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

/**
 * Renders an enriched, interactive container header dashboard card
 * displaying privacy settings, folder structure, file metrics, git status,
 * and pending unpushed local changes.
 */
export function renderContainerHeroCard(
  targetEl: HTMLElement,
  container: LentaContainerSummaryDto,
  options: ContainerHeroCardOptions
) {
  targetEl.empty();
  const { settings, changedFiles = [], folders = [], onPushPending, onRefresh } = options;

  const isPublic = isContainerPublic(container);
  const rootFolder = settings.vaultRootFolder || 'Lenta';
  const displayTitle = getContainerDisplayTitle(container);
  const containerVaultPath = `${rootFolder}/${displayTitle}`;

  // Filter unpushed changes for this container
  const containerPendingFiles = changedFiles.filter((cf) => {
    return (
      cf.relPath.startsWith(containerVaultPath + '/') ||
      cf.relPath.includes(container.id) ||
      cf.relPath.includes(container.name)
    );
  });

  const card = targetEl.createDiv({ cls: 'lenta-container-hero-card' });
  card.style.cssText = [
    'background: linear-gradient(135deg, rgba(30, 35, 35, 0.95) 0%, rgba(20, 24, 24, 0.98) 100%)',
    'border: 1px solid var(--lenta-lemon-glow, rgba(234, 179, 8, 0.25))',
    'border-radius: 10px',
    'padding: 16px 18px',
    'margin-bottom: 20px',
    'box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35)',
    'color: var(--text-normal, #e0e0e0)',
    'font-family: var(--font-interface, sans-serif)',
  ].join(';');

  // ── Header Title & Badges ──────────────────────────────────────────────────
  const titleRow = card.createDiv({ cls: 'lenta-hero-title-row' });
  titleRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;';

  const leftTitle = titleRow.createDiv();
  leftTitle.style.cssText = 'display: flex; align-items: center; gap: 10px;';
  
  const icon = leftTitle.createSpan({ cls: 'lenta-hero-icon', text: isPublic ? '📦' : '🔒' });
  icon.style.cssText = 'font-size: 1.5em;';

  const titleWrap = leftTitle.createDiv();
  const h3 = titleWrap.createEl('h3', { text: displayTitle });
  h3.style.cssText = 'margin: 0; font-weight: 700; font-size: 1.15em; color: #fff; display: flex; align-items: center; gap: 8px;';

  const shortId = container.id.length > 20 ? `${container.id.slice(0, 8)}…${container.id.slice(-4)}` : container.id;
  const idSpan = titleWrap.createEl('span', { text: `ID: ${shortId}` });
  idSpan.title = container.id;
  idSpan.style.cssText = 'font-size: 0.78em; color: var(--text-muted, #888); font-family: var(--font-monospace, monospace);';

  // Badges container
  const badgeWrap = titleRow.createDiv();
  badgeWrap.style.cssText = 'display: flex; gap: 6px; align-items: center;';

  // Privacy Badge
  const privBadge = badgeWrap.createSpan({ cls: 'lenta-badge' });
  privBadge.setText(isPublic ? '🌐 PUBLIC' : '🔐 PRIVATE');
  privBadge.style.cssText = `padding: 4px 9px; border-radius: 6px; font-weight: 700; font-size: 0.75em; ${
    isPublic
      ? 'background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4);'
      : 'background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4);'
  }`;

  // Type Badge
  const typeBadge = badgeWrap.createSpan({ cls: 'lenta-badge' });
  typeBadge.setText(container.type === 'git' ? 'VERSIONED' : (container.type || 'SIMPLE').toUpperCase());
  typeBadge.style.cssText = 'padding: 4px 9px; border-radius: 6px; font-weight: 700; font-size: 0.75em; background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4);';

  // ── Grid Pillars (4 Columns) ──────────────────────────────────────────────
  const grid = card.createDiv({ cls: 'lenta-hero-grid' });
  grid.style.cssText = [
    'display: grid',
    'grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))',
    'gap: 12px',
    'padding: 12px',
    'background: rgba(0, 0, 0, 0.25)',
    'border-radius: 8px',
    'border: 1px solid rgba(255, 255, 255, 0.07)',
    'margin-bottom: 14px',
  ].join(';');

  // Pillar 1: Privacy & Access Control
  const p1 = grid.createDiv({ cls: 'lenta-hero-pillar' });
  p1.innerHTML = `
    <div style="font-weight: 700; font-size: 0.82em; color: #fbbf24; margin-bottom: 6px; display:flex; align-items:center; gap:5px;">
      🔒 PRIVACY & ACCESS
    </div>
    <div style="font-size: 0.8em; line-height: 1.45; color: #ccc;">
      <div>• <strong>Visibility:</strong> ${isPublic ? 'Public' : 'Private'}</div>
      <div>• <strong>Scope:</strong> <code>${container.scope?.type || 'all'}</code></div>
      <div>• <strong>Auth:</strong> ${settings.containerKey ? 'Key Protected' : 'Standard API'}</div>
    </div>
  `;

  // Pillar 2: Folder Structure & Vault Mapping
  const folderNames = folders.slice(0, 3).map((f) => f.name || f.path).join(', ');
  const folderDisplay = folderNames ? (folders.length > 3 ? `${folderNames} (+${folders.length - 3})` : folderNames) : 'Root Vault';
  
  const p2 = grid.createDiv({ cls: 'lenta-hero-pillar' });
  p2.innerHTML = `
    <div style="font-weight: 700; font-size: 0.82em; color: #60a5fa; margin-bottom: 6px; display:flex; align-items:center; gap:5px;">
      📁 FOLDERS & VAULT MAPPING
    </div>
    <div style="font-size: 0.8em; line-height: 1.45; color: #ccc;">
      <div>• <strong>Vault Path:</strong> <code style="color:#a7f3d0;">${containerVaultPath}</code></div>
      <div>• <strong>Remote Folders:</strong> ${folders.length > 0 ? `${folders.length} mapped` : 'Default root'}</div>
      <div style="font-size:0.75em; color:#999; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${folderNames}">• [${folderDisplay}]</div>
    </div>
  `;

  // Pillar 3: Notes & Storage Metrics
  const p3 = grid.createDiv({ cls: 'lenta-hero-pillar' });
  p3.innerHTML = `
    <div style="font-weight: 700; font-size: 0.82em; color: #4ade80; margin-bottom: 6px; display:flex; align-items:center; gap:5px;">
      📄 FILE METRICS
    </div>
    <div style="font-size: 0.8em; line-height: 1.45; color: #ccc;">
      <div>• <strong>Tracked Notes:</strong> <strong style="color:#fff;">${container.totalNotes ?? 0} notes</strong></div>
      <div>• <strong>Root Folder:</strong> <code>${rootFolder}</code></div>
      <div>• <strong>Container Mode:</strong> ${container.type === 'git' ? 'Versioned Vault' : 'Simple File Sync'}</div>
    </div>
  `;

  // Pillar 4: Version Control / Git Status
  const commitShort = container.currentCommit ? container.currentCommit.slice(0, 7) : 'head';
  const commitMsg = container.lastCommitMessage ? (container.lastCommitMessage.length > 25 ? container.lastCommitMessage.slice(0, 25) + '...' : container.lastCommitMessage) : 'No commit yet';
  const commitDateStr = container.lastCommitDate ? formatRelativeTime(container.lastCommitDate) : 'N/A';

  const p4 = grid.createDiv({ cls: 'lenta-hero-pillar' });
  p4.innerHTML = `
    <div style="font-weight: 700; font-size: 0.82em; color: #c084fc; margin-bottom: 6px; display:flex; align-items:center; gap:5px;">
      📜 REVISION HISTORY STATUS
    </div>
    <div style="font-size: 0.8em; line-height: 1.45; color: #ccc;">
      <div>• <strong>Head Commit:</strong> <code style="color:#e9d5ff; background:rgba(192,132,252,0.15); padding:1px 5px; border-radius:4px;">${commitShort}</code> (${commitDateStr})</div>
      <div style="font-size:0.75em; color:#aaa; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${container.lastCommitMessage || ''}">• "${commitMsg}"</div>
    </div>
  `;

  // ── Pending Unpushed Local Changes Panel ───────────────────────────────────
  const pendingPanel = card.createDiv({ cls: 'lenta-hero-pending-panel' });
  pendingPanel.style.cssText = [
    'padding: 10px 14px',
    'border-radius: 6px',
    'font-size: 0.85em',
    containerPendingFiles.length > 0
      ? 'background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3); color: #fde047;'
      : 'background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.2); color: #86efac;',
  ].join(';');

  const pendingHeader = pendingPanel.createDiv({ cls: 'lenta-pending-header' });
  pendingHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;';

  const pendingTitle = pendingHeader.createDiv();
  pendingTitle.style.cssText = 'font-weight: 700; display: flex; align-items: center; gap: 6px;';

  if (containerPendingFiles.length > 0) {
    pendingTitle.innerHTML = `<span>⚡</span> <span>Pending Unpushed Changes (${containerPendingFiles.length} local note${containerPendingFiles.length > 1 ? 's' : ''} modified)</span>`;

    // Action buttons
    const actions = pendingHeader.createDiv();
    actions.style.cssText = 'display: flex; gap: 6px; align-items: center;';

    if (onPushPending) {
      const pushBtn = actions.createEl('button', {
        text: `📤 Push ${containerPendingFiles.length} Pending`,
        cls: 'mod-cta lenta-btn-lemon',
      });
      pushBtn.style.cssText = 'padding: 4px 10px; font-size: 0.8em; font-weight: 700; cursor: pointer;';
      pushBtn.onclick = async () => {
        pushBtn.disabled = true;
        pushBtn.setText('⏳ Pushing...');
        try {
          await onPushPending();
        } finally {
          pushBtn.disabled = false;
        }
      };
    }

    if (onRefresh) {
      const refreshBtn = actions.createEl('button', {
        text: '🔄',
        cls: 'clickable-icon',
      });
      refreshBtn.style.cssText = 'padding: 4px 8px; font-size: 0.8em; cursor: pointer;';
      refreshBtn.title = 'Refresh unpushed changes scan';
      refreshBtn.onclick = async () => {
        await onRefresh();
      };
    }

    // List top 3 changed files
    const fileList = pendingPanel.createDiv({ cls: 'lenta-pending-files-list' });
    fileList.style.cssText = 'margin-top: 8px; padding-top: 6px; border-top: 1px dashed rgba(234, 179, 8, 0.3); font-size: 0.9em;';

    const maxItems = 4;
    const itemsToShow = containerPendingFiles.slice(0, maxItems);
    for (const f of itemsToShow) {
      const itemRow = fileList.createDiv();
      itemRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-top: 3px; color: #fef08a; font-size: 0.9em;';
      itemRow.innerHTML = `
        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%;">📝 <code>${f.relPath}</code></span>
        <span style="font-size: 0.8em; color: rgba(254, 240, 138, 0.7);">${formatRelativeTime(f.modifiedAt)}</span>
      `;
    }

    if (containerPendingFiles.length > maxItems) {
      const overflow = fileList.createDiv();
      overflow.style.cssText = 'font-size: 0.8em; color: rgba(254, 240, 138, 0.7); margin-top: 4px; font-style: italic;';
      overflow.setText(`... and ${containerPendingFiles.length - maxItems} more unpushed file(s)`);
    }
  } else {
    pendingTitle.innerHTML = `<span>✅</span> <span>Container Vault in Sync — No pending local changes</span>`;
    
    if (onRefresh) {
      const refreshBtn = pendingHeader.createEl('button', {
        text: '🔄 Scan Changes',
      });
      refreshBtn.style.cssText = 'padding: 3px 8px; font-size: 0.8em; cursor: pointer; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: #ccc;';
      refreshBtn.onclick = async () => {
        await onRefresh();
      };
    }
  }
}
