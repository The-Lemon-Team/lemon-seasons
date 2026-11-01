# Project Lenta — Defect & Regression Prevention Log

> This document tracks all bugs, contract violations, and regressions discovered and prevented by our automated test suites (Unit, Component, Integration, and E2E Smoke).
>
> **Goal:** Measure real test effectiveness, calculate Defect Escape Rate (DER), and ensure every fixed bug has an automated regression guard.

---

## 📊 Summary Metrics

| Metric | Value |
|---|---|
| **Total Automated Tests** | 426 passing |
| **Defects Caught & Prevented by Tests** | 8 |
| **Critical / High Severity Prevented** | 5 |
| **Defect Escape to Production (Post-Test)** | 0 |
| **Test Layers Active** | Frontend Unit/Component, Backend Unit, Postgres Integration, Full-Stack E2E |

---

## 🛡️ Registered Defects & Regression Guards

### 1. `[BUG-001]` NestJS Production Entry Point Path Mismatch
- **Severity:** 🔴 Critical
- **Component:** `apps/backend`
- **Symptom:** Running `pnpm start:prod` in container or production fails immediately with `Error: Cannot find module 'dist/src/main'`.
- **Root Cause:** `apps/backend/package.json` had `"start:prod": "node dist/src/main"`, whereas `nest build` outputs the entry point to `dist/main.js`.
- **Discovered By:** E2E Playwright `webServer` boot orchestration and workspace build verification.
- **Preventing Tests:**
  - `e2e/tests/smoke.spec.ts` (boots backend in production mode)
  - `apps/backend/test/notes-api.int.spec.ts`
- **Status:** ✅ Fixed in commit `b16f2eb`

---

### 2. `[BUG-002]` Test Database Polluted by Live DriveWatcher Ingestion
- **Severity:** 🔴 High
- **Component:** `apps/backend/src/ingestion/services/drive-watcher.service.ts`
- **Symptom:** Starting backend in test mode automatically scanned `~/.lemon/sparks-incoming` (user's real notes directory) and ingested live markdown files into `lemon_calendarium_test`.
- **Root Cause:** Default fallback in `DriveWatcherService` pointed to the local home directory when `SPARKS_INCOMING_DIR` was unset.
- **Discovered By:** Backend PostgreSQL integration test harness setup.
- **Preventing Tests:**
  - `apps/backend/test/setup-int.ts` (sets isolated `SPARKS_INCOMING_DIR`)
  - `e2e/playwright.config.ts` (sets isolated `SPARKS_INCOMING_DIR=/tmp/lenta-test-incoming`)
  - `apps/backend/src/ingestion/services/sparks-parser.service.spec.ts`
- **Status:** ✅ Fixed in commit `b16f2eb` & `881f5aa`

---

### 3. `[BUG-003]` Node 22 Undici Virtual Socket Binding Crash
- **Severity:** 🔴 High
- **Component:** `apps/feed-app` (Test Harness)
- **Symptom:** Running Vitest with `msw@3` and `jsdom@30` failed on Node 22.12 with `TypeError: undici.bind is not a function`.
- **Root Cause:** Undici v8 breaking changes in Node 22 native fetch/mocking layer.
- **Discovered By:** Phase 1 frontend unit test setup.
- **Preventing Tests:**
  - `apps/feed-app/package.json` (pinned `msw@^2.15.0` and `jsdom@^26.1.0`)
  - All 17 frontend test suites in `apps/feed-app/src/**/__tests__/*.test.ts(x)`
- **Status:** ✅ Fixed in commit `a98620b`

---

### 4. `[BUG-004]` Missing Feed Folder Paths Leading to 404 / Empty Feed Filter
- **Severity:** 🟡 Medium
- **Component:** `apps/backend/src/feeds/feeds.service.ts`
- **Symptom:** Creating or updating a feed with `folderPaths: ['Spark/AI']` when the folder did not exist in the database resulted in an empty feed stream and missing folder references.
- **Root Cause:** Feeds service stored folder path strings without auto-provisioning corresponding `Folder` rows in Postgres.
- **Discovered By:** Backend feeds integration tests and Admin CMS feed modal workflow.
- **Preventing Tests:**
  - `apps/backend/test/notes-api.int.spec.ts` (`Feeds API & Binary Privacy Flow`)
  - `apps/backend/test/folders-api.int.spec.ts`
- **Status:** ✅ Fixed in commit `b92cc70`

---

### 5. `[BUG-005]` Duplicate Channel Handle `@` Prefix and Unwanted Viewport Scroll
- **Severity:** 🟢 Low / UI Polish
- **Component:** `apps/calendar-app/src/adapters/feeds/seasonsFeedAdapter.ts` & `FeedsHubView.tsx`
- **Symptom:** Channel handle rendered as `@@lemon-seasons` in feed post cards; clicking a post card triggered an unnecessary scroll-to-top of the entire container.
- **Root Cause:** Handle string had `@` prepended in multiple layers (`n.feed?.slug` already formatted with `@`), and `FeedsHubView` scrolled to top unconditionally without checking if `payload.noteId` was active.
- **Discovered By:** UI inspection during E2E smoke test verification.
- **Preventing Tests:**
  - `apps/calendar-app/src/components/feeds/FeedPostCard.tsx` (`handle.replace(/^@+/, '')`)
  - `e2e/tests/smoke.spec.ts` (`App loads and renders seeded note in stream`)
- **Status:** ✅ Fixed in commit `7641f6a`

---

### 6. `[BUG-006]` Ambiguous Modal Button Selectors in Full-Stack Stream
- **Severity:** 🟡 Medium
- **Component:** `e2e/tests/smoke.spec.ts` & `apps/feed-app/src/components/toolbar/FeedToolbarHeader.tsx`
- **Symptom:** E2E smoke tests targeting `getByRole('button', { name: /Создать/ })` clicked a toolbar button instead of the exact note creation button, and modal privacy buttons conflicted with top-bar mode switchers.
- **Root Cause:** Missing scoped locators: `page.getByRole('dialog')` was needed to isolate modal controls from background application header controls.
- **Discovered By:** Playwright E2E smoke test run 1.
- **Preventing Tests:**
  - `e2e/tests/smoke.spec.ts` (Test 2: `Modal UX contract: closes on Escape and backdrop click`, Test 3: `Create a new note through UI`, Test 4: `Binary Privacy Toggle`)
- **Status:** ✅ Fixed in commit `881f5aa`

---

### 7. `[BUG-007]` Parameterized Test Tuple Type Widening Breaking Strict Build
- **Severity:** 🟡 Medium
- **Component:** `apps/feed-app/src/components/__tests__/FeedEditNoteModal.test.tsx`
- **Symptom:** `tsc -b` compilation failed with `TS2345: Argument of type 'string' is not assignable to parameter of type '"public" | "dev" | "staging"'`.
- **Root Cause:** `it.each([ ['dev', ...], ['staging', ...], ['public', ...] ])` widened the first tuple argument to `string` instead of union literal type.
- **Discovered By:** Turbo workspace build check (`pnpm run build`).
- **Preventing Tests:**
  - `apps/feed-app/src/components/__tests__/FeedEditNoteModal.test.tsx` (marked `as const`)
  - `pnpm run lint` across all packages
- **Status:** ✅ Fixed in commit `acd61b7`

---

### 8. `[BUG-008]` HTMLMediaElement Play Promise Crash in Audio Toggle
- **Severity:** 🔴 High / Runtime Exception
- **Component:** `apps/feed-app/src/components/FeedPostCard.tsx`
- **Symptom:** Unhandled exception `TypeError: Cannot read properties of undefined (reading 'then')` when toggling audio playback on podcast notes in environments or browsers where `audioRef.current.play()` returns `undefined` (or rejects immediately).
- **Root Cause:** Invoking `.then()` directly on `audioRef.current.play()` without verifying that the return value is defined and a thenable Promise object.
- **Discovered By:** `FeedPostCard.test.tsx` component test suite.
- **Preventing Tests:**
  - `apps/feed-app/src/components/__tests__/FeedPostCard.test.tsx` (`[BUG-008] renders NotebookLM podcast widget and safely handles audio play promise`)
- **Status:** ✅ Fixed in `FeedPostCard.tsx`

---

## 📋 How to Register New Defects

When writing a regression test for a new bug:
1. Add the test with a descriptive tag in its title:
   ```ts
   it('[BUG-008] handles empty hashtag string without creating invalid tag', () => { ... });
   ```
2. Log the entry in this file (`docs/testing/DEFECT_LOG.md`) with the symptom, root cause, and preventing test.
3. Run `pnpm test:map` to refresh the automated test map.
