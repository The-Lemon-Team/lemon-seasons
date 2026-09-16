---
title: "Offline-First Note Architecture: Last-Write-Wins vs Vector Clocks"
primary_folder: "04_Archive/Thoughts"
folders:
  - "04_Archive/Thoughts"
  - "04_Archive"
taxonomy:
  - "architecture.sync"
tags:
  - "Thoughts"
  - "OfflineFirst"
  - "CRDT"
type: "SINGLE"
start_date: "2026-09-10T11:00:00.000Z"
icon: "sparkles"
---

# Offline-First Note Architecture: Last-Write-Wins vs Vector Clocks

### Offline-First Philosophy

In client-first applications like Obsidian, files are the ultimate source of truth for the author.

- Field-level Last-Write-Wins (LWW) with hash verification provides predictable merges without heavyweight CRDT overhead.
- `lenta_id` in frontmatter ensures note identity survives file renames and moves across directories.
