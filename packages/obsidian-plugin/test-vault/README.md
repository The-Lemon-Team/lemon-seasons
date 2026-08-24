# 🍋 Lemon Lenta — Test Vault

This is a local development vault for testing the **Lemon Lenta Obsidian plugin**.

## Setup

1. Open this folder as a vault in Obsidian:  
   `File → Open vault… → Open folder as vault`  
   Select: `packages/obsidian-plugin/test-vault`

2. Enable the plugin:  
   `Settings → Community Plugins → disable Safe Mode → enable "Lemon Lenta — Chronological Hub & Sync"`

3. In a terminal, start the watch build:  
   ```
   pnpm plugin:dev
   ```
   Every time you save a source file, esbuild rebuilds and writes directly into `.obsidian/plugins/lemon-lenta-sync/`.  
   Use **Ctrl+R** inside Obsidian (or the **Hot-reload** plugin) to pick up changes instantly.
