# 🍋 Project Lenta — Headless CMS & Chronological Data Hub

Project Lenta is a high-performance headless CMS and chronological data hub designed as a **single source of truth** for time-based records (events, news, releases, milestones). The system is built to power three distinct client applications:
1. **Admin CMS** (React + Ant Design + TanStack Query)
2. **React Calendar App** (Consuming range queries on `startDate`/`endDate`)
3. **Obsidian Local Sync Plugin** (Offline-first delta synchronization via `updatedAt` and non-destructive `deletedAt` soft deletes)

---

## 🏛️ Architectural Constraints ("Load-Bearing Walls")

1. **Sync-Ready**: All models include `updatedAt` and `deletedAt` (Soft Deletes) to support offline-first local synchronization without physical data loss.
2. **Content Agnostic**: The `description` field in the Note model stores raw Markdown with live preview in the Admin CMS.
3. **Hierarchical Taxonomy**: Materialized path classification (`TaxonomyNode.path`) converted to PostgreSQL's native `ltree` type via a custom Prisma migration step with GiST indexing.
4. **Range & Sync Indexes**: Composite index on `[startDate, endDate]` for calendar queries and index on `[updatedAt]` for delta sync pulls.

---

## 🛠️ Tech Stack

- **Backend**: Nest.js 10, TypeScript, Prisma ORM 6, PostgreSQL 16, Swagger / OpenAPI
- **Frontend**: React 18, Ant Design 5, TanStack Query v5, React Router v7, Tailwind CSS, Lucide React
- **Database**: PostgreSQL with `ltree` extension support via Docker Compose
- **Design System**: *Lenta Admin System* Olive Gold palette (`#c9cd58`), Dark Charcoal surfaces (`#121414`), Inter UI typography, and JetBrains Mono metadata/code typography.

---

## 🚀 Quick Start

### 1. Start PostgreSQL Database (Docker)
```bash
docker compose up -d
```
*PostgreSQL is exposed on port `5433` (configurable via `.env`).*

### 2. Backend Setup & Migrations
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```
- **Backend API**: [http://localhost:3001](http://localhost:3001)
- **Swagger Documentation**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

### 3. Frontend Setup (React Admin CMS)
```bash
cd ../frontend
npm install
npm run dev
```
- **Admin CMS**: [http://localhost:5173](http://localhost:5173)

---

## 📐 Data Models & Schema

```prisma
model Feed {
  id          String    @id @default(uuid())
  title       String
  description String?
  slug        String    @unique
  notes       Note[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
}

model Note {
  id          String    @id @default(uuid())
  feedId      String
  feed        Feed      @relation(fields: [feedId], references: [id])
  title       String
  description String?   // Raw Markdown
  type        NoteType
  startDate   DateTime
  endDate     DateTime?
  sourceLink  String?
  icon        String?
  tags        TaxonomyNode[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  @@index([startDate, endDate])
  @@index([updatedAt])
}

model TaxonomyNode {
  id          String    @id @default(uuid())
  name        String
  path        String    @unique // Altered to PostgreSQL ltree in migration
  notes       Note[]
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime? 
}

enum NoteType {
  SINGLE
  PERIOD
  EVENT
  FILM_RELEASE
  MENTION
  DONE
}
```

---

## 🔌 Key API Endpoints

- `GET /feeds` — List active feeds with note count aggregations
- `POST /feeds` — Create feed with auto-generated slug
- `DELETE /feeds/:id` — Soft-delete feed
- `GET /notes` — Query notes with filters (`feedId`, `type`, `startDateFrom`, `startDateTo`, `tagPath`, `search`)
- `POST /notes` — Create note with Markdown description and taxonomy tags
- `GET /taxonomy/tree` — Return nested hierarchical taxonomy tree
- `POST /taxonomy` — Create root or child taxonomy tag
- `GET /sync/changes?since=<ISO_TIMESTAMP>` — Delta sync pull endpoint for Obsidian offline sync

---

## 🎨 Design System & Prototypes

The Admin CMS UI matches the **Lemon Seasons / Lenta Admin System** prototypes:
- **Feeds**: Bento-ish activity grid + Table mode with hover action bars
- **Notes**: Data table with NoteType color badges, formatted timestamps, taxonomy path pills, and status indicators
- **Quick Add**: Modal with NoteType selector, date range pickers, taxonomy Ltree path, and Markdown editor
- **Taxonomy Tree**: Interactive visual hierarchy with expandable branches and note count pills
