---
lenta_id: "f64cad8e-f738-454a-a26c-9d68f1cb512d"
title: "Q3 Technical Architecture Review"
feed: "tech-strategy"
type: "EVENT"
start_date: "Tue Oct 24 2023 13:00:00 GMT+0300 (Москва, стандартное время)"
end_date: "Tue Oct 24 2023 14:30:00 GMT+0300 (Москва, стандартное время)"
primary_folder: "Engineering/Architecture"
folders:
  - "Engineering/Architecture"
  - "Projects/Lenta"
taxonomy:
  - "engineering.architecture"
icon: "architecture"
updated_at: "Tue Sep 15 2026 20:30:04 GMT+0300 (Москва, стандартное время)"
deleted: false
---

# Q3 Technical Architecture Review

### Architectural Decisions (ADRs)
Completed evaluation of headless data store sync patterns:
- Selected **Soft Deletes** with `updatedAt` indexing for offline-first Obsidian clients.
- Adopted PostgreSQL native `ltree` for lightning-fast hierarchical queries (`<@`, `@>`).
- Decoupled admin UI using TanStack Query caching and Ant Design tokens.