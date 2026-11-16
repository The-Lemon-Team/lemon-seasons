# Obsidian Work Deferred (Leave on Hold)

All work related to Obsidian integration across `lemon-calendarium` / `lemon-seasons` is **temporarily deferred / left on hold ("на потом")** and may be omitted from current development, refactoring, and verification:

- **Scope covered:**
  - `packages/obsidian-plugin`
  - `packages/obsidian-containers`
  - `container-sync-server` (Docker service / port `:3031`)
  - Backend & Admin UI features specific to Obsidian containers / Obsidian vault sync
- **Agent behavior:**
  - Do **not** proactively modify, refactor, debug, start, or run tests/builds targeting Obsidian packages or services.
  - Only touch Obsidian-related code or containers if the user explicitly requests it in the current task.
