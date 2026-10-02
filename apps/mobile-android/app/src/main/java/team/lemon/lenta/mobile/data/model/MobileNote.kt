package team.lemon.lenta.mobile.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

enum class NoteType {
    TEXT,
    TODO
}

@Entity(tableName = "mobile_notes")
data class MobileNote(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val sessionId: String? = null,
    val title: String = "",
    val content: String = "",
    val color: String = KeepColor.DEFAULT.id,
    val isPinned: Boolean = false,
    val isArchived: Boolean = false,
    val type: NoteType = NoteType.TEXT,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val syncStatus: SyncStatus = SyncStatus.PENDING
)
