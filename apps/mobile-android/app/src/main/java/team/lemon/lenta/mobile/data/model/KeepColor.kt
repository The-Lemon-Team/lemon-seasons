package team.lemon.lenta.mobile.data.model

import androidx.compose.ui.graphics.Color

enum class KeepColor(
    val id: String,
    val displayName: String,
    val cardBackground: Color,
    val borderColor: Color
) {
    DEFAULT("default", "Default", Color(0xFF1E293B), Color(0xFF334155)),
    LEMON("lemon", "Lemon", Color(0xFF352E1B), Color(0xFFEAB308)),
    SAGE("sage", "Sage", Color(0xFF1B3326), Color(0xFF22C55E)),
    CORAL("coral", "Coral", Color(0xFF3A1E24), Color(0xFFEF4444)),
    SKY("sky", "Sky", Color(0xFF1A2E3D), Color(0xFF38BDF8)),
    LAVENDER("lavender", "Lavender", Color(0xFF2E1F3D), Color(0xFFA855F7)),
    SAND("sand", "Sand", Color(0xFF342921), Color(0xFFF97316)),
    CHARCOAL("charcoal", "Charcoal", Color(0xFF111827), Color(0xFF475569));

    companion object {
        fun fromId(id: String?): KeepColor {
            return entries.find { it.id.equals(id, ignoreCase = true) } ?: DEFAULT
        }
    }
}
