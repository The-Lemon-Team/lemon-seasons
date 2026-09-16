---
lenta_id: "754d7f23-bf1b-48dd-aafe-3ab871837110"
title: "Dual Folder Engine Architecture & Folder Manager View"
type: "SINGLE"
start_date: "2026-09-13T14:00:00.000Z"
end_date: null
primary_folder: "02_Projects/Lenta"
folders:
  - "02_Projects/Lenta"
  - "02_Projects"
taxonomy:
  - "projects.lenta.architecture"
tags:
  - "ui"
  - "architecture"
  - "lenta"
icon: "lemon"
updated_at: "2026-09-17T16:13:39.924Z"
deleted: false
---

# Dual Folder Engine Architecture & Folder Manager View

### Dual Folder Engine Specification

Project Lenta supports two orthogonal hierarchical dimensions:
1. **Taxonomy Tree (ltree)**: Subject classification for filtering and facet navigation.
2. **Virtual Folders (NoteFolder)**: Obsidian vault file tree projection for local file explorer parity.

The Folder Manager View provides a full Obsidian Explorer UI inside the Calendar web application.