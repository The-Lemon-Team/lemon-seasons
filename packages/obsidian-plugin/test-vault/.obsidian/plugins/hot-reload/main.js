const { Plugin, Notice } = require("obsidian");
const fs = require("fs");
const path = require("path");

module.exports = class HotReloadPlugin extends Plugin {
  async onload() {
    console.log("⚡ [Hot Reload] Plugin loader active.");
    this.pluginDirs = new Map();
    this.reloading = new Set();
    this.app.workspace.onLayoutReady(() => this.startWatching());
  }

  startWatching() {
    const pluginsDir = path.join(this.app.vault.adapter.basePath, ".obsidian", "plugins");
    if (!fs.existsSync(pluginsDir)) return;

    const checkPlugins = () => {
      try {
        const dirs = fs.readdirSync(pluginsDir);
        for (const dir of dirs) {
          if (dir === "hot-reload" || dir.startsWith(".")) continue;
          const pluginPath = path.join(pluginsDir, dir);
          const stat = fs.statSync(pluginPath);
          if (stat.isDirectory()) {
            this.watchPlugin(dir, pluginPath);
          }
        }
      } catch (e) {
        console.error("Hot-Reload error scanning plugins dir:", e);
      }
    };

    checkPlugins();
    this.registerInterval(window.setInterval(checkPlugins, 1000));
  }

  watchPlugin(id, pluginPath) {
    if (this.pluginDirs.has(id)) return;
    this.pluginDirs.set(id, true);

    let lastMtime = 0;
    const checkModified = () => {
      try {
        const files = ["main.js", "styles.css", "manifest.json", ".hotreload"];
        let maxMtime = 0;
        for (const file of files) {
          const filePath = path.join(pluginPath, file);
          if (fs.existsSync(filePath)) {
            const mtime = fs.statSync(filePath).mtimeMs;
            if (mtime > maxMtime) maxMtime = mtime;
          }
        }

        if (lastMtime > 0 && maxMtime > lastMtime) {
          if (!this.reloading.has(id)) {
            this.reloading.add(id);
            console.log(`⚡ [Hot Reload] Reloading plugin: ${id}`);
            this.reloadPlugin(id);
            setTimeout(() => this.reloading.delete(id), 1500);
          }
        }
        lastMtime = maxMtime;
      } catch (e) {
        // file locked or temporarily writing
      }
    };

    checkModified();
    this.registerInterval(window.setInterval(checkModified, 500));
  }

  async reloadPlugin(id) {
    try {
      const plugins = this.app.plugins;
      if (plugins.manifests[id]) {
        await plugins.disablePlugin(id);
        await plugins.enablePlugin(id);
        new Notice(`⚡ [Hot Reload] ${id} updated & reloaded!`, 2000);
      }
    } catch (e) {
      console.error(`⚡ [Hot Reload] Failed to reload ${id}:`, e);
    }
  }

  onunload() {
    console.log("⚡ [Hot Reload] Plugin loader unloaded.");
  }
};
