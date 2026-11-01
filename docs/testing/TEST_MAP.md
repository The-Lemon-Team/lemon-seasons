# Project Lenta — Test Map

> Generated automatically from test suite execution reports.
> Regenerate anytime with `pnpm test:map`. Do not edit by hand.

**Totals:** 442 passed, 0 failed, 3 todo/skipped (445 total across all suites)

## 🛡️ Defect Shield & Regression Prevention

> **Active Regression Guards:** 10 automated tests preventing known regressions.
> See full defect register and root cause analysis in [DEFECT_LOG.md](DEFECT_LOG.md).

- ✅ **[BUG-007] publication stage "dev" maps to privacy/status** (`feed-app` → `src/components/__tests__/FeedEditNoteModal.test.tsx`)
- ✅ **[BUG-007] publication stage "staging" maps to privacy/status** (`feed-app` → `src/components/__tests__/FeedEditNoteModal.test.tsx`)
- ✅ **[BUG-007] publication stage "public" maps to privacy/status** (`feed-app` → `src/components/__tests__/FeedEditNoteModal.test.tsx`)
- ✅ **[BUG-008] renders NotebookLM podcast widget and safely handles audio play promise** (`feed-app` → `src/components/__tests__/FeedPostCard.test.tsx`)
- ✅ **[BUG-004] auto-provisions missing folders when creating a feed** (`backend-int` → `test/folders-api.int.spec.ts`)
- ✅ **[BUG-002] returns 200 OK and status in isolated test environment** (`backend-int` → `test/notes-api.int.spec.ts`)
- ✅ **1. [BUG-001] App loads and renders seeded note in the chronological stream** (`e2e-smoke` → `../smoke.spec.ts`)
- ✅ **2. [BUG-006] Modal UX contract: closes on Escape and backdrop click (AGENTS.md §7)** (`e2e-smoke` → `../smoke.spec.ts`)
- ✅ **4. [BUG-006] Binary Privacy Toggle: switch between Private and Public (AGENTS.md §9)** (`e2e-smoke` → `../smoke.spec.ts`)
- ✅ **6. [BUG-006] Binary Privacy Isolation: Private notes and admin controls hidden in Public mode (AGENTS.md §9)** (`e2e-smoke` → `../smoke.spec.ts`)

## Frontend unit & component tests — `feed-app`

### Domain: Note

#### Create modal (18)
_Source: `src/components/__tests__/FeedCreateNoteModal.test.tsx`_

- **FeedCreateNoteModal** _(18)_
  - **Create › defaults** _(6)_
    - ✅ dev mode defaults to Private + PUBLISHED, type SINGLE, author Admin
    - ✅ staging mode defaults to Public + DRAFT
    - ✅ uses defaultDate for the event date
    - ✅ preselects the feed matching defaultFeedSlug once feeds load
    - ✅ leaves the feed empty when defaultFeedSlug matches nothing
    - ✅ lists feeds with an emoji fallback for ligature-style icons
  - **Create › with no errors** _(2)_
    - ✅ sends a minimal note and reports success
    - ✅ closes itself shortly after a successful save
  - **Create › special params** _(5)_
    - ✅ parses hashtags separated by spaces/commas and strips #
    - ✅ omits endDate (the form has no end-date field, even for PERIOD)
    - ✅ changing privacy toggle and status is reflected in the payload
    - ✅ attaches the selected feed and type
    - ✅ clearing the author sends no author/curator
  - **Create › validation and errors** _(3)_
    - ✅ rejects a whitespace-only title without calling the API
    - ✅ shows the server message and stays open on failure
    - ✅ re-enables submit after a failure so the user can retry
  - **Create › form lifecycle** _(2)_
    - ✅ resets the form when reopened
    - ✅ Cancel closes without calling the API

#### Detail (read) modal (20)
_Source: `src/components/__tests__/FeedDetailModal.test.tsx`_

- **FeedDetailModal** _(20)_
  - **Detail › rendering** _(5)_
    - ✅ renders nothing without an item
    - ✅ shows channel, handle (single @), category, title and markdown body
    - ✅ renders GFM (tables) from the description
    - ✅ shows the resonance score only when it is a number (0 counts)
    - ✅ shows curator and source link only when provided
  - **Detail › cover image** _(3)_
    - ✅ uses coverUrl, falling back to the main image, then the first image
    - ✅ hides the cover if it fails to load
    - ✅ retries the cover when a different item is shown
  - **Detail › actions** _(4)_
    - ✅ hides Edit / AI-cover buttons unless handlers are passed
    - ✅ calls onEditNote and onAiCover with the item
    - ✅ clicking a hashtag selects it (without #) and closes the modal
    - ✅ hashtag click still closes when no onSelectTag is provided
  - **Detail › keyboard / dismissal (AGENTS.md §7)** _(6)_
    - ✅ closes on Escape
    - ✅ ignores Escape when disableEscClose is set (child modal on top)
    - ✅ removes the Escape listener on unmount
    - ✅ closes on backdrop click, not on card click
    - ✅ closes via the X button
    - 📝 does not close when a drag that started inside the card is released on the backdrop (currently closes: the card stops mousedown propagation, so the overlay never records the origin)
  - **Detail › body scroll lock** _(2)_
    - ✅ locks page scroll while open and restores the previous value on close
    - ✅ does not touch scroll while there is no item

#### Edit modal (23)
_Source: `src/components/__tests__/FeedEditNoteModal.test.tsx`_

- **FeedEditNoteModal** _(23)_
  - **Edit › rendering and prefill** _(6)_
    - ✅ renders nothing without an item
    - ✅ prefills fields from the item
    - ✅ falls back to curator for author and to rawPayload.summary for summary
    - ✅ prefills the event date from rawPayload.startDate, else publishedAt
    - ✅ shows the cover state and wires the AI cover button
    - ✅ shows the active-cover state when the item has a cover
  - **Edit › saving with no errors** _(2)_
    - ✅ PATCHes /notes/:id with the edited fields and reports success
    - ✅ closes shortly after a successful save
  - **Edit › special params** _(9)_
    - ✅ keeps the original startDate (with time) when the date is untouched
    - ✅ normalises edited hashtags
    - ✅ [BUG-007] publication stage "dev" maps to privacy/status
    - ✅ [BUG-007] publication stage "staging" maps to privacy/status
    - ✅ [BUG-007] publication stage "public" maps to privacy/status
    - ✅ publishing a draft sets publishAt; unpublishing clears it
    - ✅ preselects the stage from the item (public + PUBLISHED → Public)
    - ✅ "Сгенерировать выжимку" fills the summary from the description
    - ✅ quick IT-cover presets call onOpenAiCover with a template id
  - **Edit › validation and errors** _(2)_
    - ✅ rejects an empty title without calling the API
    - ✅ shows the server error and stays open on failure
  - **Edit › keyboard / dismissal (AGENTS.md §7)** _(4)_
    - ✅ closes on Escape
    - ✅ does NOT close on Escape when disableEscClose is set (nested child on top)
    - ✅ closes on backdrop click but not on dialog-card click
    - ✅ removes the Escape listener on unmount

#### Post card (metrics, cover, snippet, audio) (18)
_Source: `src/components/__tests__/FeedPostCard.test.tsx`_

- **FeedPostCard** _(18)_
  - **PostCard › rendering** _(6)_
    - ✅ renders channel title, handle with single @, category badge and note title
    - ✅ formats date and displays time in Russian locale
    - ✅ shows views count and high resonance badge when score >= 80
    - ✅ shows curator when provided and not "auto"
    - ✅ shows up to 3 hashtags stripping leading #
    - ✅ shows folder path badge in staging mode when provided
  - **PostCard › cover image** _(3)_
    - ✅ renders image banner with coverUrl
    - ✅ falls back to rawPayload images when coverUrl is absent
    - ✅ hides cover image when error occurs
  - **PostCard › expand / collapse** _(2)_
    - ✅ displays snippet for short text and does not show expand button
    - ✅ shows "Читать далее" for long description and toggles full text
  - **PostCard › actions and callbacks** _(5)_
    - ✅ calls onOpenDetail when card is clicked
    - ✅ calls onEditNote and stops propagation to onOpenDetail
    - ✅ calls onAiCover and stops propagation to onOpenDetail
    - ✅ calls onSelectTag and stops propagation to onOpenDetail
    - ✅ copies link on share button click
  - **PostCard › staging moderation & audio player** _(2)_
    - ✅ renders StagingCardModerationBar in staging mode
    - ✅ [BUG-008] renders NotebookLM podcast widget and safely handles audio play promise

#### Update payload builder (5)
_Source: `src/utils/__tests__/noteFormPayload.test.ts`_

- **buildSafeNoteUpdatePayload** _(5)_
  - ✅ preserves original startDate time and does not overwrite publishAt when user saves without changing date
  - ✅ preserves existing publishAt timestamp if note was already published with a timestamp
  - ✅ sets publishAt to current time when transitioning from DRAFT to PUBLISHED for the first time
  - ✅ clears publishAt when unpublishing to DRAFT
  - ✅ updates startDate while preserving time if user explicitly changes eventDate

#### Periods (PERIOD notes, horizons, badges) (27)
_Source: `src/utils/__tests__/periods.test.ts`_

- **getPeriodActivityStatus** _(6)_
  - ✅ is upcoming when start is on a later day
  - ✅ is active when it starts later today
  - ✅ is finished when endDate is on an earlier day
  - ✅ is active when endDate is today
  - ✅ open-ended period is finished after more than 10 idle days
  - ✅ open-ended period with recent metadata.lastActivityAt stays active
- **extractPeriodItems** _(4)_
  - ✅ keeps only non-archived PERIOD notes
  - ✅ drops digests regardless of language/case
  - ✅ normalises hashtags (strings and objects, strips #, lowercases)
  - ✅ resolves emoji and color with fallbacks
- **filterNotesByHorizon** _(4)_
  - ✅ 'recent' excludes the future and sorts newest first
  - ✅ 'recent' keeps items with invalid dates
  - ✅ 'upcoming' includes today onward and sorts earliest first
  - ✅ does not mutate the input array
- **isNoteInPeriodTimeWindow** _(3)_
  - ✅ is inclusive of the start and end days
  - ✅ rejects before start, after end and invalid dates
  - ✅ open-ended periods have no upper bound
- **isNoteBoundToPeriod** _(4)_
  - ✅ binds via parentNoteId
  - ✅ binds via hashtag overlap, ignoring # and case
  - ✅ binds via same feed only inside the time window
  - ✅ does not bind unrelated items
- **filterNotesByPeriod** _(2)_
  - ✅ 'bound' uses semantic links only
  - ✅ 'all' uses the time window only
- **extractPeriodMicroBadges** _(4)_
  - ✅ puts bound badges first, then active ones
  - ✅ caps visible at 3 and moves the rest to overflow
  - ✅ with a selected period returns only that period
  - ✅ returns nothing when the item is outside every window

### Domain: Feed

#### Create / edit / delete feed modal (25)
_Source: `src/components/__tests__/FeedEntityModal.test.tsx`_

- **FeedEntityModal** _(25)_
  - **Feed › create** _(5)_
    - ✅ shows create-mode header and defaults (public, 📁, blue)
    - ✅ auto-generates the slug from the title
    - ✅ POSTs /feeds with the entered data, then calls onSaved and onClose
    - ✅ omits an empty description
    - ✅ a manually edited slug is kept in create mode until the title changes again
  - **Feed › special params** _(6)_
    - ✅ privacy toggle maps to binary public/private
    - ✅ preset emoji and preset color buttons update the payload
    - ✅ the custom color picker updates the payload
    - ✅ adds folders (button and Enter), trims, rejects duplicates and blanks, and removes them
    - ✅ adds hashtags without # (button and Enter), rejects duplicates, removes them
    - ✅ Enter inside the folder input does not submit the form
  - **Feed › edit** _(5)_
    - ✅ prefills from feedData and shows edit-mode header with the slug
    - ✅ PATCHes /feeds/:id and keeps the existing slug when the title changes
    - ✅ prefills from a feedTab (always public, accent color) and PATCHes when it has a real id
    - ✅ a virtual feedTab (id === slug) is saved via POST and cannot be deleted
    - ✅ resets to a blank form when reopened in create mode
  - **Feed › delete** _(3)_
    - ✅ deletes after confirmation, then calls onSaved and onClose
    - ✅ does nothing when the confirmation is declined
    - ✅ shows the server error and stays open when deletion fails
  - **Feed › validation and errors** _(3)_
    - ✅ rejects an empty title without calling the API
    - ✅ shows the server error and stays open when saving fails
    - ✅ clears a previous error on the next successful attempt
  - **Feed › keyboard / dismissal (AGENTS.md §7)** _(3)_
    - ✅ renders nothing when closed
    - ✅ closes on Escape and removes the listener on unmount
    - ✅ closes on backdrop click, not on card click; Cancel closes without API calls

#### Feed stream view (loading, empty states, pagination) (14)
_Source: `src/components/__tests__/FeedStreamView.test.tsx`_

- **FeedStreamView** _(14)_
  - **StreamView › loading state** _(1)_
    - ✅ renders loading indicator when isLoading is true
  - **StreamView › empty states** _(6)_
    - ✅ renders default empty state when there are no items and no search query
    - ✅ renders search empty state when searchQuery is present
    - ✅ renders spark empty state and transition button when streamSource is spark
    - ✅ renders month filter empty state and reset button when month filter is active
    - ✅ renders "Создать первую запись" button in staging mode and handles click
    - ✅ suppresses "Создать первую запись" in public mode
  - **StreamView › feed items rendering** _(4)_
    - ✅ renders list of feed items via FeedPostCard
    - ✅ triggers onOpenDetail when an item is clicked in the stream
    - ✅ suppresses edit and AI cover actions in public mode
    - ✅ provides edit action in staging mode
  - **StreamView › pagination sentinel** _(2)_
    - ✅ renders pagination sentinel when visibleCount is less than feedItems.length
    - ✅ does not render pagination sentinel when all items are visible
  - **StreamView › telegram mode** _(1)_
    - ✅ renders TelegramStreamView when streamSource is telegram

#### Feed filters hook (4)
_Source: `src/hooks/__tests__/useFeedFilters.test.ts`_

- **useFeedFilters** _(4)_
  - ✅ manages search query and deferred value
  - ✅ manages month navigation and filter state
  - ✅ handles horizon switching
  - ✅ handles period selection and updates feed slug if matching period has feedSlug

#### Feed adapters (6)
_Source: `src/adapters/feeds/__tests__/configuredFeedAdapter.test.ts`_

- **createConfiguredFeedAdapter with DEFAULT_FEED_MODES** _(6)_
  - ✅ correctly adapts IT & Dev notes based on filterConfig
  - ✅ correctly adapts Seasons notes based on filterConfig
  - ✅ correctly adapts Entertainment notes based on filterConfig
  - ✅ correctly adapts Holidays notes based on filterConfig
  - ✅ strictly isolates Private notes when privacy=private filter is configured
  - ✅ generates thematic tabs for matching feeds

### Domain: Navigation

#### Mobile categories bottom sheet (5)
_Source: `src/components/navigation/__tests__/FeedCategoriesSheet.test.tsx`_

- **FeedCategoriesSheet** _(5)_
  - ✅ renders nothing when isOpen is false
  - ✅ renders categories and channel tabs when open
  - ✅ closes on backdrop click
  - ✅ closes on Escape key press
  - ✅ calls onSelectFeed when clicking a channel button

### Domain: Workspace

#### Delete track / workspace modals (13)
_Source: `src/components/workspace/__tests__/DeleteModals.test.tsx`_

- **DeleteTrackModal** _(7)_
  - ✅ shows the track title
  - ✅ renders nothing without a track
  - ✅ confirms and then closes
  - ✅ shows the API error and stays open when deletion fails
  - ✅ falls back to a default message for errors without details
  - ✅ disables both actions and ignores double clicks while deleting
  - ✅ Cancel button closes without confirming
- **DeleteWorkspaceModal** _(6)_
  - ✅ keeps delete disabled until the exact (trimmed) title is typed
  - ✅ is case-sensitive
  - ✅ confirms with Enter once the title matches, then closes
  - ✅ does not confirm on Enter when the title does not match
  - ✅ shows an error and stays open on failure
  - ✅ resets the typed text when reopened

#### Pinned notes dock (3)
_Source: `src/components/workspace/__tests__/PinnedNotesDock.test.tsx`_

- **PinnedNotesDock - Nested Modal Escape UX** _(3)_
  - ✅ closes the workspace drawer on Escape when no nested modal is open (disableEscClose=false)
  - ✅ does NOT close the workspace drawer on Escape when a nested modal (e.g. Note Detail) is open (disableEscClose=true)
  - ✅ resumes Escape handling to close the drawer after child modal closes (disableEscClose toggles from true to false)

### Domain: App shell

#### App mode sync hook (4)
_Source: `src/hooks/__tests__/useFeedAppModeSync.test.ts`_

- **useFeedAppModeSync** _(4)_
  - ✅ initializes default app mode and edit mode
  - ✅ updates appMode and persists in localStorage and URL
  - ✅ toggles editMode in dev mode
  - ✅ syncs mode from host container message

#### Theme hook (light / dark / system) (3)
_Source: `src/hooks/__tests__/useFeedTheme.test.ts`_

- **useFeedTheme** _(3)_
  - ✅ initializes with dark mode false if document has no dark class
  - ✅ initializes with dark mode true if document has dark class
  - ✅ toggles theme correctly and updates document element class

#### Runtime mode (dev / staging / public) (16)
_Source: `src/utils/__tests__/appMode.test.ts`_

- **appMode** _(16)_
  - **isPublicEnvironment** _(3)_
    - ✅ is false by default
    - ✅ is true when VITE_FEED_APP_MODE=public
    - ✅ is true when build MODE=public
  - **resolveFeedAppMode** _(9)_
    - ✅ defaults to dev
    - ✅ forces public in a public environment, ignoring query and storage
    - ✅ reads ?appMode=public from the query string
    - ✅ reads ?mode=staging from the query string
    - ✅ reads ?appMode=dev from the query string
    - ✅ reads ?mode=admin from the query string
    - ✅ falls back to localStorage when the query is absent
    - ✅ query string wins over localStorage
    - ✅ ignores unknown values
  - **normalizeNotesForPublicFeeds** _(4)_
    - ✅ swaps in the public feed and records both feeds in metadata
    - ✅ uses publicFeed.id when publicFeedId is missing
    - ✅ leaves notes without a public feed untouched (same reference)
    - ✅ does not mutate the original note

#### Host navigation (iframe / standalone) (6)
_Source: `src/utils/__tests__/hostNavigation.test.ts`_

- **navigateToHostCalendar** _(3)_
  - ✅ posts a LENTA_HOST_NAVIGATE message to the parent when embedded
  - ✅ opens the host app in a new tab when standalone
  - ✅ falls back to opening a tab when "embedded" but there is no distinct parent
- **navigateToHostTimeline** _(3)_
  - ✅ posts a LENTA_HOST_NAVIGATE message to the parent when embedded
  - ✅ opens the host app in a new tab when standalone
  - ✅ falls back to opening a tab when "embedded" but there is no distinct parent

### Domain: Cross-cutting

#### Modal UX contract (AGENTS.md §7) (32)
_Source: `src/components/__tests__/modalUxContract.test.tsx`_

- **DeleteTrackModal modal UX contract** _(8)_
  - ✅ renders nothing when closed
  - ✅ closes on Escape
  - ✅ ignores other keys
  - ✅ closes when the backdrop is clicked
  - ✅ does not close when the dialog card is clicked
  - ✅ removes the Escape listener on unmount
  - ✅ does not listen for Escape while closed
  - ✅ stops listening after being closed via props
- **DeleteWorkspaceModal modal UX contract** _(8)_
  - ✅ renders nothing when closed
  - ✅ closes on Escape
  - ✅ ignores other keys
  - ✅ closes when the backdrop is clicked
  - ✅ does not close when the dialog card is clicked
  - ✅ removes the Escape listener on unmount
  - ✅ does not listen for Escape while closed
  - ✅ stops listening after being closed via props
- **LemonSeasonsModal modal UX contract** _(8)_
  - ✅ renders nothing when closed
  - ✅ closes on Escape
  - ✅ ignores other keys
  - ✅ closes when the backdrop is clicked
  - ✅ does not close when the dialog card is clicked
  - ✅ removes the Escape listener on unmount
  - ✅ does not listen for Escape while closed
  - ✅ stops listening after being closed via props
- **FeedCategoriesSheet modal UX contract** _(8)_
  - ✅ renders nothing when closed
  - ✅ closes on Escape
  - ✅ ignores other keys
  - ✅ closes when the backdrop is clicked
  - ✅ does not close when the dialog card is clicked
  - ✅ removes the Escape listener on unmount
  - ✅ does not listen for Escape while closed
  - ✅ stops listening after being closed via props

#### Modals coordination hook (6)
_Source: `src/hooks/__tests__/useFeedModalsState.test.ts`_

- **useFeedModalsState - Open Note by ID and Workspace integration** _(6)_
  - **Keyboard shortcuts for Create Note** _(3)_
    - ✅ opens create note modal when "c" is pressed without modifiers
    - ✅ does not open create note modal when Ctrl+C or Cmd+C is pressed
    - ✅ does not open create note modal when a modal dialog is present in DOM
  - ✅ opens note detail modal immediately when handleOpenNoteById is called with an in-memory note
  - ✅ opens note detail modal immediately when initialNote is passed from workspace pin
  - ✅ fetches full note from API by ID when not found in memory


## Backend unit tests — `backend`

### Domain: Backend / Note

#### Notes cache service (12)
_Source: `src/notes/notes-cache.service.spec.ts`_

- **NotesCacheService** _(12)_
  - **Cache › get / set** _(4)_
    - ✅ returns null for unknown keys
    - ✅ returns stored data until the default 20s TTL elapses
    - ✅ honours a custom TTL
    - ✅ overwrites and refreshes an existing key
  - **Cache › capacity** _(1)_
    - ✅ evicts the oldest entry once 100 entries are stored
  - **Cache › invalidateAll** _(2)_
    - ✅ clears every entry
    - ✅ is a no-op on an empty cache
  - **Cache › generateKey** _(5)_
    - ✅ is independent of parameter order
    - ✅ ignores undefined, null and empty-string params
    - ✅ keeps falsy-but-meaningful values (0 and false)
    - ✅ separates different prefixes and different values
    - ✅ distinguishes admin from non-admin queries (no cross-privilege cache leaks)

#### Notes query builder (48)
_Source: `src/notes/notes-query.builder.spec.ts`_

- **NotesQueryBuilder** _(48)_
  - **Notes query › baseline** _(1)_
    - ✅ always excludes soft-deleted notes
  - **Notes query › privacy / app-mode gating** _(6)_
    - ✅ 'public' mode shows only public + PUBLISHED, even for admins
    - ✅ 'staging' mode shows public notes that are not yet PUBLISHED
    - ✅ 'dev' mode applies no privacy restriction by default and honours an explicit privacy filter
    - ✅ non-admin callers without an app mode only ever see public + PUBLISHED notes
    - ✅ a non-admin cannot widen visibility by requesting privacy=private
    - ✅ an admin without app mode may filter by privacy
  - **Notes query › feed filter** _(10)_
    - ✅ by feedId: matches the feed itself, the public feed, plus folders and hashtags of that feed
    - ✅ by feedId for an unknown feed falls back to a plain feedId match
    - ✅ by feedSlug resolves the feed, ignoring soft-deleted ones
    - ✅ legacy slug russian-holidays expands to its aliases when the feed does not exist
    - ✅ legacy slug christian-holidays expands to its aliases when the feed does not exist
    - ✅ legacy slug orthodox-holidays expands to its aliases when the feed does not exist
    - ✅ legacy slug wiki expands to its aliases when the feed does not exist
    - ✅ an unknown slug falls back to an exact slug match
    - ✅ feedId takes precedence over feedSlug
    - ✅ publicFeedId takes precedence over publicFeedSlug
  - **Notes query › type, status, author** _(7)_
    - ✅ filters by type
    - ✅ status=staging means "anything but PUBLISHED"
    - ✅ status=NOT_PUBLISHED means "anything but PUBLISHED"
    - ✅ status=!PUBLISHED means "anything but PUBLISHED"
    - ✅ passes a concrete status through
    - ✅ ignores the status param when an appMode already controls status
    - ✅ author and curator both filter on the author column (case-insensitive)
  - **Notes query › hashtags and folders** _(4)_
    - ✅ hashtag filter is normalised (# stripped, lower-cased)
    - ✅ unfiled notes are those without any folder link
    - ✅ folder filters normalise paths (slashes, trimming)
    - ✅ folderPrefix matches both the denormalised folderPath and linked folders
  - **Notes query › container privacy** _(5)_
    - ✅ limits other users to global notes, public containers and their own containers
    - ✅ anonymous callers (no userId) only get global and public-container notes
    - ✅ containers=a,b,,c is parsed into a trimmed list
    - ✅ containers made only of separators adds no filter
    - 📝 container privacy must not be skippable by passing userId=usr-admin-999 in the query string (userId is a client-supplied QueryNotesDto field, and that id disables the container filter)
  - **Notes query › search** _(3)_
    - ✅ ignores blank search text
    - ✅ searches title, description, feed title, author, hashtags and folder paths
    - ✅ skips the hashtag clause when the search normalises to an empty tag
  - **Notes query › date windows** _(5)_
    - ✅ overlap window includes notes spanning it, single-day notes inside it, and open-ended periods
    - ✅ overlapStart/overlapEnd are aliases for queryStart/queryEnd
    - ✅ overlap wins over explicit start/end ranges
    - ✅ a half-open overlap window (only a start) falls back to the range filters
    - ✅ builds startDate / endDate ranges independently
  - **Notes query › ordering** _(7)_
    - ✅ defaults to newest startDate first
    - ✅ sorts by {"sortBy":"title","sortOrder":"asc"}
    - ✅ sorts by {"sortBy":"type"}
    - ✅ sorts by {"sortBy":"folder","sortOrder":"asc"}
    - ✅ sorts by {"sortBy":"startDate","sortOrder":"asc"}
    - ✅ treats any sortOrder other than asc as desc
    - ✅ falls back to the default for unknown sort keys

### Domain: Backend / Auth

#### Auth context middleware (22)
_Source: `src/auth/auth-context.middleware.spec.ts`_

- **AuthContextMiddleware** _(22)_
  - **Auth › guest** _(2)_
    - ✅ treats requests without credentials as the guest user and calls next()
    - ✅ falls back to guest for an unknown token that is not in the DB
  - **Auth › token transport** _(6)_
    - ✅ accepts the master admin token via Authorization: Bearer <token>
    - ✅ accepts the master admin token via Authorization: <token> (no scheme)
    - ✅ accepts the master admin token via x-api-key
    - ✅ accepts the master admin token via x-user-key
    - ✅ accepts the master admin token via x-admin-token
    - ✅ trims whitespace around a bearer token
  - **Auth › admin tokens** _(5)_
    - ✅ accepts a configured ADMIN_TOKEN from ConfigService
    - ✅ accepts any lenta_adm_master_* prefixed token
    - ✅ treats demo admin token lenta_tok_admin_abc as admin
    - ✅ treats demo admin token admin-demo-token as admin
    - ✅ does not query the database for admin tokens
  - **Auth › user keys (database)** _(8)_
    - ✅ resolves a valid, non-revoked key to its user
    - ✅ marks users with role=admin as admin
    - ✅ rejects revoked keys (falls back to guest)
    - ✅ rejects keys whose user no longer exists
    - ✅ caches a resolved key so repeated requests skip the database
    - ✅ re-queries after the 60s cache TTL
    - ✅ falls back to guest when the lookup fails
    - ✅ still accepts demo lenta_tok_user_* tokens when the DB has no match
  - **Auth › known gaps** _(1)_
    - 📝 a request must not become admin just because it presents the hard-coded default master token (the token is committed to source and also hard-coded in the feed-app client bundle)

### Domain: Backend / Ingestion

#### Gemini Sparks parser (49)
_Source: `src/ingestion/services/sparks-parser.service.spec.ts`_

- **SparksParserService** _(49)_
  - **Spark › title** _(4)_
    - ✅ uses the first heading
    - ✅ falls back to the file name without the DD.MM.YY prefix and extension
    - ✅ also strips ISO date prefixes from file names
    - ✅ uses a generic title when nothing else is available
  - **Spark › dates (filename date is canonical)** _(10)_
    - ✅ derives the start date from DD.MM.YY in the file name at noon UTC when frontmatter has none
    - ✅ supports 4-digit years in the file name
    - ✅ supports ISO dates in the file name
    - ✅ keeps the frontmatter time but aligns the calendar day with the file name
    - ✅ preserves explicit event_date without aligning to filename
    - ✅ shifts late-evening UTC times back 3h so the Moscow calendar day matches the file name
    - ✅ uses the frontmatter start date as-is when the file name has no date
    - ✅ accepts startDate and date as aliases
    - ✅ falls back to the file mtime, then to "now", when no date is known
    - ✅ ignores an invalid frontmatter date
  - **Spark › note type** _(9)_
    - ✅ is SINGLE by default
    - ✅ is PERIOD only when marked PERIOD AND the span exceeds 24h
    - ✅ a marked PERIOD without an end date is demoted to SINGLE
    - ✅ infers PERIOD from a multi-day end date even without an explicit type
    - ✅ honours other valid explicit types
    - ✅ digests are always SINGLE, even if marked PERIOD (Дайджест недели)
    - ✅ digests are always SINGLE, even if marked PERIOD (Сводка дня)
    - ✅ digests are always SINGLE, even if marked PERIOD (Weekly Digest)
    - ✅ guesses EVENT from meetup-like titles
  - **Spark › time slot and icon** _(6)_
    - ✅ title "Утренний выпуск" → MORNING
    - ✅ title "Вечерний выпуск" → EVENING
    - ✅ title "Дневной выпуск" → AFTERNOON
    - ✅ falls back to the UTC hour of the start date
    - ✅ frontmatter icon overrides the default
    - ✅ adds the matching slot hashtag
  - **Spark › hashtags (AGENTS.md §6)** _(4)_
    - ✅ always tags generated notes with gemini-spark
    - ✅ NEVER emits jmdaily, from frontmatter tags (any casing) or from the body
    - ✅ de-duplicates tags from frontmatter, body and slot rules
    - ✅ marks digests with the сводка/дайджест tags
  - **Spark › frontmatter whitelist** _(9)_
    - ✅ never emits system fields (feed, lenta_id) on the note DTO
    - ✅ defaults privacy to private and honours an explicit privacy
    - ✅ status draft → DRAFT
    - ✅ status SCHEDULED → SCHEDULED
    - ✅ status Archived → ARCHIVED
    - ✅ status whatever → PUBLISHED
    - ✅ parses publish_at and drops invalid values
    - ✅ reads resonance_score as number or numeric string
    - ✅ author falls back to curator
  - **Spark › links and source** _(2)_
    - ✅ keeps only links with a url, flags the first as source, and uses it as sourceLink
    - ✅ falls back to source / sourceLink / url frontmatter
  - **Spark › summary** _(4)_
    - ✅ prefers frontmatter summary, then description
    - ✅ extracts the "Суть" section and strips markdown
    - ✅ falls back to the first plain paragraph and truncates to 280 chars
    - ✅ returns an empty summary for an empty body
  - **Spark › provenance metadata** _(1)_
    - ✅ records source type, external id and file info

### Domain: Backend / Taxonomy

#### Hashtags and folders normalization (29)
_Source: `src/hashtags/text-helpers.spec.ts`_

- **HashtagsService (pure helpers)** _(15)_
  - **Hashtags › normalizeName** _(10)_
    - ✅ "#AI" → "ai"
    - ✅ "##Double" → "double"
    - ✅ "  Spaced  " → "spaced"
    - ✅ "#Новости" → "новости"
    - ✅ "snake_case-kebab" → "snake_case-kebab"
    - ✅ "tag!@$%^&*()" → "tag"
    - ✅ "with space" → "withspace"
    - ✅ "#2026" → "2026"
    - ✅ "" → ""
    - ✅ is safe for nullish input
  - **Hashtags › extractFromText** _(5)_
    - ✅ returns [] for empty input
    - ✅ extracts and normalises tags, de-duplicating them
    - ✅ does not treat markdown headings as tags
    - ✅ ignores # glued to a word (urls, anchors)
    - ✅ finds a tag at the very start of the text and after newlines
- **FoldersService (pure helpers)** _(14)_
  - **Folders › normalizePath** _(9)_
    - ✅ "Spark/AI" → "Spark/AI"
    - ✅ "/Spark/AI/" → "Spark/AI"
    - ✅ "\\Spark\\AI\\" → "Spark/AI"
    - ✅ "Spark//AI///Deep" → "Spark/AI/Deep"
    - ✅ "  Spark/AI  " → "Spark/AI"
    - ✅ "/" → ""
    - ✅ "" → ""
    - ✅ is idempotent
    - ✅ is safe for nullish input
  - **Folders › getFolderName** _(5)_
    - ✅ "Spark/AI" → "AI"
    - ✅ "Single" → "Single"
    - ✅ "a/b/c " → "c"
    - ✅ "" → "Folder"
    - ✅ "a/" → "Folder"

### Domain: Backend / Sync

#### Note state mapper (HLC clocks) (6)
_Source: `src/sync/note-state.mapper.spec.ts`_

- **toNoteSyncState** _(6)_
  - **Sync › note state mapper** _(6)_
    - ✅ maps the scalar fields, id and version
    - ✅ produces a clock for every scalar field
    - ✅ uses stored field clocks where present
    - ✅ stamps unstamped fields with a fallback derived from updatedAt (same for all, deterministic)
    - ✅ the fallback grows with updatedAt so newer rows win over older unstamped ones
    - ✅ passes the tombstone through

### Domain: Other

#### src/ingestion/services/news-verification.service.spec.ts (10)
_Source: `src/ingestion/services/news-verification.service.spec.ts`_

- **DateExtractionUtil** _(7)_
  - ✅ extracts date from Russian DD.MM.YY filename format
  - ✅ extracts date from ISO YYYY-MM-DD filename format
  - ✅ extracts date from URL path with ISO format
  - ✅ extracts date from URL path with English month name
  - ✅ extracts date from URL path with reverse month name
  - ✅ parses publication date from HTML meta tags
  - ✅ parses publication date from Schema.org JSON-LD
- **NewsVerificationService** _(3)_
  - ✅ prioritizes preserved frontmatter date over filename digest date
  - ✅ extracts date from source URL regex when frontmatter matches digest date
  - ✅ falls back to digest date when no external or earlier date is found


## Backend integration tests (PostgreSQL) — `backend-int`

### Domain: Backend / Integration

#### Folders API & Obsidian tree (PostgreSQL) (6)
_Source: `test/folders-api.int.spec.ts`_

- **Project Lenta Backend - Folders API Integration (PostgreSQL)** _(6)_
  - **POST /folders - Creation & Path Normalization** _(3)_
    - ✅ creates a root folder with binary privacy "public" and extracts name
    - ✅ normalizes paths with slashes and whitespace
    - ✅ [BUG-004] auto-provisions missing folders when creating a feed
  - **GET /folders/tree - Hierarchical Obsidian Explorer** _(1)_
    - ✅ builds a nested parent-child tree structure from flat paths
  - **Binary Privacy & Scoping (AGENTS.md §9)** _(1)_
    - ✅ enforces privacy visibility: anonymous sees only public folders, admin sees all
  - **DELETE & Soft-Deletion Lifecycle** _(1)_
    - ✅ soft deletes folder and sets deletedAt timestamp

#### Notes, feeds & privacy API (PostgreSQL) (4)
_Source: `test/notes-api.int.spec.ts`_

- **Project Lenta Backend - Notes & Feeds Integration (PostgreSQL)** _(4)_
  - **GET /health** _(1)_
    - ✅ [BUG-002] returns 200 OK and status in isolated test environment
  - **Feeds API & Binary Privacy Flow** _(1)_
    - ✅ creates a feed and retrieves it in the list
  - **Notes API & Unified Privacy Architecture (AGENTS.md rule 9)** _(2)_
    - ✅ creates public and private notes, enforcing privacy visibility filters
    - ✅ updates note fields and soft deletes via DELETE

#### Sync engine & HLC merge (PostgreSQL) (5)
_Source: `test/sync-api.int.spec.ts`_

- **Project Lenta Backend - Sync Engine API Integration (PostgreSQL)** _(5)_
  - **POST /sync/events - Apply Sync Events (Idempotency & Merge)** _(4)_
    - ✅ applies an UPSERT note event, creating the note with HLC clocks in PostgreSQL
    - ✅ guarantees event idempotency by eventId, returning DUPLICATE on re-delivery
    - ✅ resolves concurrent updates using HLC Last-Write-Wins (LWW) per field
    - ✅ soft deletes note on DELETE action and preserves tombstone
  - **GET /sync/pull - Pull Changes with Cursor** _(1)_
    - ✅ returns notes changed since cursor with their field clocks and deletion state


## End-to-End smoke tests (Frontend + Backend + PostgreSQL) — `e2e-smoke`

### Domain: E2E / Smoke

#### Full-stack smoke tests (6)
_Source: `../smoke.spec.ts`_

- **Project Lenta E2E Smoke Tests (Frontend + Backend + PostgreSQL)** _(6)_
  - ✅ 1. [BUG-001] App loads and renders seeded note in the chronological stream
  - ✅ 2. [BUG-006] Modal UX contract: closes on Escape and backdrop click (AGENTS.md §7)
  - ✅ 3. Create a new note through UI and verify it appears in the stream
  - ✅ 4. [BUG-006] Binary Privacy Toggle: switch between Private and Public (AGENTS.md §9)
  - ✅ 5. View note details in FeedDetailModal and edit title through FeedEditNoteModal
  - ✅ 6. [BUG-006] Binary Privacy Isolation: Private notes and admin controls hidden in Public mode (AGENTS.md §9)

