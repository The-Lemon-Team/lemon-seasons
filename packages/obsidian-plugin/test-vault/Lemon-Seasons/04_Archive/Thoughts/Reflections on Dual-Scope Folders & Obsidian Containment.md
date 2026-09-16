---
lenta_id: "a4380eab-3c0f-4eb0-a74b-1f0b1dd91c79"
title: "Reflections on Dual-Scope Folders & Obsidian Containment"
type: "SINGLE"
start_date: "2026-09-12T15:30:00.000Z"
end_date: null
primary_folder: "04_Archive/Thoughts"
folders:
  - "04_Archive/Thoughts"
  - "04_Archive"
taxonomy:
  - "architecture.thoughts"
tags:
  - "thoughts"
  - "architecture"
  - "obsidian"
icon: "sparkles"
updated_at: "2026-09-15T20:04:17.437Z"
deleted: false
---

# Reflections on Dual-Scope Folders & Obsidian Containment

### Dual-Scope Folders: The Core Tradeoff

External project folders broadcast globally to all connected vaults, whereas internal container folders are strictly isolated to personal encrypted vaults.

Key takeaways:
1. Never mix public and private note references in internal logs.
2. Delta sync must filter by `containerId` at the database query level.
3. The UI must clearly indicate scope badges (EXT vs INT) so users have zero doubt about privacy.