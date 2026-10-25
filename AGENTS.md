# Agent Guidelines for Lemon Calendarium / Project Lenta

## Browser Manipulation
- **Browser manipulation and browser subagents (`browser_subagent`) are enabled**.
- Validate web applications and UI flows using browser subagent sessions, visual inspections, TypeScript build checks (`pnpm run build`), and API checks.

## Architecture & Code Modularity Guidelines

### 1. File Size Limits & Single Responsibility Principle (SRP)
- **Target file limit**: Keep source files under 300–400 lines whenever possible. Any file exceeding 500 lines is a prime candidate for immediate architectural decomposition.
- **Orchestrator Pattern**: High-level services and engines (e.g. `ChatsService`, `AgentChatEngine`) must act as clean orchestrators, delegating domain work to dedicated subservices or generator functions.

### 2. Declarative Routers & Functional Programming (FP)
- **Avoid procedural `if / else if` ladders**: Never write 100+ line procedural `if/else` ladders for command parsing or keyword detection.
- **Use declarative mapping**:
  - Express command routers via handler arrays or maps: `Record<string, CommandHandler>`.
  - Express keyword detection via declarative rule tables: `Array<{ match: (text: string) => boolean; target: AgentId }>`.
  - Use functional predicates (`Array.filter`, `Array.some`, declarative dictionaries) for data filtering and story assignment.

### 3. Modular Ingestion Services & Domain Engines
- Background ingestion services, parsers, and pipeline handlers must be independent modular units (e.g. `apps/backend/src/ingestion/services/`).
- Central services must act as orchestrators, delegating specialized extraction, classification, and transformation to dedicated handlers.
- Shared utilities (formatting, filters, date math) belong in dedicated helper files or `@lenta/shared`.

### 4. UI Component Decomposition
- **Separate calculations from rendering**: Extract complex data transformation, history diffing, and filter aggregations into separate `utils/` files (e.g. `obsidianContainers.utils.ts`).
- **Extract subcomponents**:
  - Break large views into focused subcomponents (e.g. `<ContainerChangeLogStream />`, `<ContainerCardItem />`, `<AddContainerModal />`, `<ObsidianGuideModal />`).
  - Keep the parent view focused on layout, routing, and high-level state coordination.

### 5. Verification & Backward Compatibility
- When refactoring, always preserve existing public exports and method signatures (`export * from ...`, re-exports in index files).
- Always verify refactorings with full workspace build checks (`pnpm run build` / `turbo run build`).

### 6. Spark Content Generation & Ingestion Standards
- All Spark notes in `spark/` and `docs/templates/` must comply with [SPARK_GENERATION_RULES.md](file:///c:/Users/Ilege/projects/lemon-calendarium/docs/rules/SPARK_GENERATION_RULES.md) and [.agents/rules/spark_generation.md](file:///c:/Users/Ilege/projects/lemon-calendarium/.agents/rules/spark_generation.md).
- Filename format: `DD.MM.YY - <Title>.md`. The frontmatter `start_date` MUST strictly match the calendar day in the filename.
- Whitelist only user frontmatter fields; never emit system fields (`curator`, `feed`, `lenta_id`).
- Tag daily digest materials with `jmdaily`.

