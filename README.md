# 🍋 Lemon Seasons — Collaborative Calendar & Chronological Knowledge Hub

**Lemon Seasons** is the primary calendar and chronological note platform of The Lemon Team. Built around the foundational vision of time-based knowledge, it enables users to manually capture, organize, and explore events, notes, milestones, and shared cultural calendars.

Repository: [git@github.com:The-Lemon-Team/lemon-seasons.git](https://github.com/The-Lemon-Team/lemon-seasons)

---

## 🎯 The Core Vision

Lemon Seasons remains focused on human-centric calendar workflows and structured note-taking:
- **Chronological Clarity**: Timeline, month grid, and day views designed to visualize historical events, project milestones, and daily notes simultaneously.
- **Manual Note Taking & Organization**: Clean, fast capture of notes with tags, folders, custom links, and rich Markdown formatting.
- **Comprehensive Calendar Feeds**:
  - Built-in multi-cultural presets: Orthodox, Catholic, Islamic, World Religions, Russian Military Glory, and State Holidays.
- **Vault & Container Isolation**:
  - Native multi-container architecture supporting distinct workspaces (e.g. personal, work, community).
- **Two-Way Obsidian Sync**:
  - Synchronize notes and folders seamlessly between local Obsidian vaults and the backend database.

---

## 🏛️ Monorepo Structure

- **`apps/calendar-app`**: React 18 + Vite chronological consumer calendar application.
- **`apps/admin-cms`**: React + Ant Design administrative console for calendar feeds, folders, and notes.
- **`apps/backend`**: Nest.js 10 backend with PostgreSQL (`ltree`), holiday engines, natural language date parsers, and sync services.
- **`packages/shared`**: Shared TypeScript models, contracts, and frontmatter utilities.
- **`packages/obsidian-plugin`**: Svelte 4 Obsidian sync plugin with container tree views and bi-directional sync.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### 2. Start PostgreSQL Database
```bash
pnpm run db:up
```

### 3. Install Dependencies & Build
```bash
pnpm install
pnpm run build
```

### 4. Database Setup & Seed
```bash
pnpm run backend:prisma:migrate
pnpm run backend:prisma:seed
```

### 5. Run Development Mode
```bash
pnpm run dev
# or local stack:
pnpm run dev:local
```

- **Calendar App**: [http://localhost:5173](http://localhost:5173)
- **Admin CMS**: [http://localhost:5174](http://localhost:5174)
- **Backend API**: [http://localhost:3001](http://localhost:3001)
- **API Docs (Swagger)**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
