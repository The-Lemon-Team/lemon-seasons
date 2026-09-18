package team.lemon.lenta.mobile.data.model

data class ShareTemplate(
    val id: String,
    val name: String,
    val icon: String,
    val description: String,
    val apply: (title: String, url: String, notes: String, folder: String) -> String
) {
    companion object {
        val ALL = listOf(
            ShareTemplate(
                id = "standard",
                name = "Standard Link",
                icon = "🔗",
                description = "Clean markdown link with source and personal notes",
                apply = { title, url, notes, folder ->
                    buildString {
                        appendLine("Saved from Android device to `$folder`.")
                        appendLine()
                        appendLine("- **Source**: [$url]($url)")
                        if (notes.isNotBlank()) {
                            appendLine()
                            appendLine("### Notes")
                            appendLine(notes.trim())
                        }
                    }
                }
            ),
            ShareTemplate(
                id = "obsidian_callout",
                name = "Obsidian Callout",
                icon = "🍋",
                description = "Obsidian callout block with clickable link and tags",
                apply = { title, url, notes, folder ->
                    buildString {
                        appendLine("> [!info] Web Bookmark")
                        appendLine("> **Source**: [$title]($url)")
                        appendLine("> **Folder**: `$folder`")
                        if (notes.isNotBlank()) {
                            appendLine()
                            appendLine("## Excerpt / Thoughts")
                            appendLine(notes.trim())
                        }
                    }
                }
            ),
            ShareTemplate(
                id = "reading_list",
                name = "Reading List",
                icon = "📋",
                description = "Interactive checklist item for read-later queue",
                apply = { title, url, notes, _ ->
                    buildString {
                        appendLine("- [ ] #read-later [$title]($url)")
                        if (notes.isNotBlank()) {
                            appendLine("  - Notes: ${notes.trim()}")
                        }
                    }
                }
            )
        )

        fun getById(id: String): ShareTemplate {
            return ALL.find { it.id == id } ?: ALL.first()
        }
    }
}
