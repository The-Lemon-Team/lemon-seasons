import { spawn, execSync } from 'child_process';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

export class ObsidianE2EHarness {
  constructor(options = {}) {
    this.obsidianPath = options.obsidianPath || process.env.OBSIDIAN_PATH || 'C:\\Users\\Ilege\\AppData\\Local\\Programs\\Obsidian\\Obsidian.exe';
    this.backendUrl = (options.backendUrl || process.env.BACKEND_URL || 'http://localhost:3001').replace(/\/+$/, '');
    this.cdpPort = options.cdpPort || 9222;
    this.vaultPath = path.resolve(options.vaultPath || 'test-vault');
    this.tempProfileDir = path.resolve('scratch/.obsidian-e2e-profile');

    this.proc = null;
    this.browser = null;
    this.vaultPage = null;
    this.userKey = null;
    this.containerId = null;
  }

  async setupBackendEnvironment() {
    console.log(`🔍 Checking backend reachability at ${this.backendUrl}...`);
    const healthRes = await fetch(`${this.backendUrl}/feeds`);
    if (healthRes.status !== 200) {
      throw new Error(`Backend is offline at ${this.backendUrl} (status ${healthRes.status})`);
    }

    // Provision dedicated user and key for isolated Obsidian testing
    console.log('🔑 Provisioning dedicated E2E test key on backend...');
    const keyRes = await fetch(`${this.backendUrl}/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'obsidian-e2e-user',
        provider: 'obsidian',
        name: 'Obsidian E2E Test Key',
      }),
    });

    if (keyRes.status !== 201 && keyRes.status !== 200) {
      throw new Error(`Failed to create test key: ${await keyRes.text()}`);
    }

    const keyData = await keyRes.json();
    this.userKey = keyData.key;
    console.log(`✅ Dedicated E2E user key created: ${this.userKey} (userId: ${keyData.userId})`);

    // Verify key validation endpoint
    console.log('🔒 Validating key via /keys/validate endpoint...');
    const valRes = await fetch(`${this.backendUrl}/keys/validate?key=${encodeURIComponent(this.userKey)}`);
    const valData = await valRes.json();
    if (!valData.valid) {
      throw new Error(`Key validation failed for ${this.userKey}`);
    }
    console.log(`✅ Key validation confirmed! (Name: "${valData.name}", User: "${valData.userId}")`);

    this.containerId = `cont-${this.userKey}`;
  }

  buildPlugin() {
    console.log('🔨 Building plugin bundle into test-vault...');
    execSync('node esbuild.config.mjs production', { stdio: 'pipe' });
    console.log('✅ Plugin bundle built successfully.');
  }

  configureTestVaultSettings() {
    const pluginDir = path.join(this.vaultPath, '.obsidian', 'plugins', 'lemon-lenta-sync');
    if (!fs.existsSync(pluginDir)) {
      fs.mkdirSync(pluginDir, { recursive: true });
    }

    const settings = {
      serverUrl: this.backendUrl,
      authToken: this.userKey,
      username: 'obsidian-e2e-user',
      userEmail: 'obsidian-e2e-user@lemon.team',
      isPrivateContainerConnected: true,
      activeContainerId: this.containerId,
      activeContainerIds: [this.containerId],
      containerKey: this.userKey,
      connectedContainerName: '🔒 Dedicated E2E Test Vault Container',
      connectedContainerType: 'obsidian',
      vaultRootFolder: 'Lemon-Seasons',
      autoSyncIntervalMinutes: 0,
      defaultFeedSlug: '',
      lastSyncedAt: '',
      lastSyncedCommit: '',
      defaultConflictStrategy: 'create_backup_fork',
      autoSyncOnEdit: false,
      containerServerUrl: this.backendUrl,
      containerApiKey: '',
      containerPrivacyFilter: 'all',
    };

    fs.writeFileSync(path.join(pluginDir, 'data.json'), JSON.stringify(settings, null, 2));
    console.log('✅ Plugin settings configured with dedicated user key.');
  }

  async launchObsidian() {
    if (!fs.existsSync(this.tempProfileDir)) {
      fs.mkdirSync(this.tempProfileDir, { recursive: true });
    }

    const obsidianConfig = {
      vaults: {
        'test-vault-e2e': {
          path: this.vaultPath,
          ts: Date.now(),
          open: true,
        },
      },
    };
    fs.writeFileSync(path.join(this.tempProfileDir, 'obsidian.json'), JSON.stringify(obsidianConfig, null, 2));

    console.log(`🚀 Launching Obsidian desktop with vault: ${this.vaultPath}...`);
    this.proc = spawn(this.obsidianPath, [
      `--user-data-dir=${this.tempProfileDir}`,
      `--remote-debugging-port=${this.cdpPort}`,
    ], {
      detached: false,
      stdio: 'ignore',
    });

    console.log(`🔌 Connecting to Obsidian via CDP on port ${this.cdpPort}...`);
    for (let i = 0; i < 20; i++) {
      try {
        this.browser = await chromium.connectOverCDP(`http://127.0.0.1:${this.cdpPort}`);
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (!this.browser) {
      throw new Error(`Could not connect to Obsidian on port ${this.cdpPort} after 20 attempts.`);
    }
    console.log('✅ CDP connected to real Obsidian runtime!');

    const context = this.browser.contexts()[0];
    for (let i = 0; i < 15; i++) {
      const pages = context.pages();
      this.vaultPage = pages.find((p) => p.url().includes('index.html'));
      if (this.vaultPage) break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (!this.vaultPage) {
      throw new Error('Obsidian workspace index.html window did not load.');
    }

    await this.vaultPage.waitForFunction(() => {
      return typeof window.app !== 'undefined' && window.app?.workspace?.layoutReady === true;
    }, { timeout: 20000 });

    console.log('✅ Obsidian Workspace layout ready.');

    // Activate plugin
    const loaded = await this.vaultPage.evaluate(async () => {
      const app = window.app;
      if (typeof app.plugins.setEnable === 'function') {
        app.plugins.setEnable(true);
      }
      await app.plugins.loadManifests();
      if (typeof app.plugins.loadPlugin === 'function') {
        await app.plugins.loadPlugin('lemon-lenta-sync');
      }
      if (typeof app.plugins.enablePlugin === 'function') {
        await app.plugins.enablePlugin('lemon-lenta-sync');
      }
      return !!app.plugins.plugins['lemon-lenta-sync'];
    });

    if (!loaded) {
      throw new Error('Failed to activate lemon-lenta-sync plugin inside Obsidian.');
    }
    console.log('✅ Plugin lemon-lenta-sync activated inside Obsidian.');
  }

  async evalInObsidian(fn, arg) {
    return this.vaultPage.evaluate(fn, arg);
  }

  async createNoteInVault(relativePath, content) {
    return this.vaultPage.evaluate(async ({ path, text }) => {
      const file = await window.app.vault.create(path, text);
      return { path: file.path, name: file.name };
    }, { path: relativePath, text: content });
  }

  async readNoteFromVault(relativePath) {
    return this.vaultPage.evaluate(async (path) => {
      const file = window.app.vault.getAbstractFileByPath(path);
      if (!file) return null;
      return window.app.vault.read(file);
    }, relativePath);
  }

  async deleteNoteFromVault(relativePath) {
    return this.vaultPage.evaluate(async (path) => {
      const file = window.app.vault.getAbstractFileByPath(path);
      if (file) {
        await window.app.vault.trash(file, true);
        return true;
      }
      return false;
    }, relativePath);
  }

  async pushNote(relativePath) {
    return this.vaultPage.evaluate(async (path) => {
      const plugin = window.app.plugins.plugins['lemon-lenta-sync'];
      const file = window.app.vault.getAbstractFileByPath(path);
      if (!file) throw new Error(`File not found: ${path}`);
      return plugin.syncEngine.pushLocalNote(file);
    }, relativePath);
  }

  async pullChanges() {
    return this.vaultPage.evaluate(async () => {
      const plugin = window.app.plugins.plugins['lemon-lenta-sync'];
      return plugin.syncEngine.pullChanges();
    });
  }

  async createNoteOnServer(dto) {
    const res = await fetch(`${this.backendUrl}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.userKey}`,
      },
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      throw new Error(`Failed to create note on server: ${await res.text()}`);
    }
    return res.json();
  }

  async getNoteFromServer(id) {
    const res = await fetch(`${this.backendUrl}/notes/${id}`);
    if (!res.ok) return null;
    return res.json();
  }

  async updateNoteOnServer(id, dto) {
    const res = await fetch(`${this.backendUrl}/notes/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.userKey}`,
      },
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      throw new Error(`Failed to update note on server: ${await res.text()}`);
    }
    return res.json();
  }

  async deleteNoteFromServer(id) {
    await fetch(`${this.backendUrl}/notes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.userKey}` },
    }).catch(() => {});
  }

  async close() {
    console.log('🛑 Closing Obsidian and cleaning up test profile...');
    if (this.browser) {
      await this.browser.close().catch(() => {});
    }
    if (this.proc) {
      this.proc.kill();
    }
    try {
      fs.rmSync(this.tempProfileDir, { recursive: true, force: true });
    } catch {}
    console.log('✅ Obsidian closed and profile cleaned up.');
  }
}
