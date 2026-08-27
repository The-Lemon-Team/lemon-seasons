import { LentaContainerSummaryDto } from '../types';
import { isContainerPublic } from '../utils/container-privacy';

export interface PrivacySelectorOptions {
  container: LentaContainerSummaryDto;
  disabled?: boolean;
  onChange: (newPrivacy: 'public' | 'private') => void | Promise<void>;
}

/**
 * UI Component that renders an interactive selection control for changing container privacy
 * (Public 🌐 vs Private 🔐).
 */
export class PrivacySelectorComponent {
  private container: LentaContainerSummaryDto;
  private disabled: boolean;
  private onChange: (newPrivacy: 'public' | 'private') => void | Promise<void>;

  constructor(options: PrivacySelectorOptions) {
    this.container = options.container;
    this.disabled = options.disabled ?? false;
    this.onChange = options.onChange;
  }

  render(parentEl: HTMLElement): HTMLElement {
    const isPublic = isContainerPublic(this.container);
    
    const wrapper = parentEl.createDiv({ cls: 'lenta-privacy-selector-wrapper' });
    wrapper.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 4px;
      border-radius: 6px;
      background: var(--background-secondary-alt, #1e2222);
      border: 1px solid var(--background-modifier-border, #333);
      font-size: 0.8em;
    `;

    const publicBtn = wrapper.createEl('button', {
      cls: `lenta-privacy-btn ${isPublic ? 'is-active' : ''}`,
      text: '🌐 Public',
    });
    publicBtn.disabled = this.disabled;
    publicBtn.style.cssText = `
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: ${isPublic ? '700' : '500'};
      border: none;
      cursor: ${this.disabled ? 'not-allowed' : 'pointer'};
      background: ${isPublic ? 'rgba(34, 197, 94, 0.25)' : 'transparent'};
      color: ${isPublic ? '#4ade80' : 'var(--text-muted, #888)'};
      transition: all 0.15s ease;
    `;

    const privateBtn = wrapper.createEl('button', {
      cls: `lenta-privacy-btn ${!isPublic ? 'is-active' : ''}`,
      text: '🔐 Private',
    });
    privateBtn.disabled = this.disabled;
    privateBtn.style.cssText = `
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: ${!isPublic ? '700' : '500'};
      border: none;
      cursor: ${this.disabled ? 'not-allowed' : 'pointer'};
      background: ${!isPublic ? 'rgba(245, 158, 11, 0.25)' : 'transparent'};
      color: ${!isPublic ? '#fbbf24' : 'var(--text-muted, #888)'};
      transition: all 0.15s ease;
    `;

    publicBtn.onclick = (e) => {
      e.stopPropagation();
      if (this.disabled || isPublic) return;
      this.onChange('public');
    };

    privateBtn.onclick = (e) => {
      e.stopPropagation();
      if (this.disabled || !isPublic) return;
      this.onChange('private');
    };

    return wrapper;
  }
}
