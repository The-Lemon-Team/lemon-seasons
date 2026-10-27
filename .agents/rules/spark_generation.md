# Spark Generation Rules for AI Agents

All AI agents generating or modifying Spark notes in `C:\Users\Ilege\Мой диск\spark\` or `docs/templates/` must strictly comply with the following specification:

1. **Filename & Date Matching:**
   - Format: `DD.MM.YY - <Title>.md` (e.g. `25.10.26 - Title.md`).
   - `start_date` in frontmatter MUST strictly match the calendar day in the filename: `"2026-10-25T07:15:00.000Z"`.
   - Never write yesterday's date into `start_date` when the file belongs to today's digest.

2. **Tags & Labels:**
   - Include topic tags.
   - DO NOT include `jmdaily` tag; `jmdaily` is reserved exclusively for admin analytical curation.
   - Tags are YAML string arrays without `#` symbol.

3. **Frontmatter Whitelist:**
   - Allowed: `title`, `type`, `start_date`, `end_date`, `tags`, `links`, `cover_image`, `podcast_audio`, `published`, `icon`, `resonance_score`.
   - Forbidden: `feed`, `process`, `taxonomy`, `folders`, `primary_folder`, `lenta_id`, `updated_at`, `deleted`.

4. **Typography & Spacing:**
   - Exactly two empty lines after frontmatter before `# Title`.
   - Standard sections: `## 📌 Суть события`, `## 🔎 Детали и контекст`, `## 🧭 Аналитическая оценка`, `## 🔗 Связанные записи`.
