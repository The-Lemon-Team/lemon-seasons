package team.lemon.lenta.mobile.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

enum class SessionStatus {
    ACTIVE,
    SEALED,
    SYNCED
}

@Entity(tableName = "mobile_sessions")
data class MobileSession(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val title: String = "Mobile Draft Session",
    val status: SessionStatus = SessionStatus.ACTIVE,
    val createdAt: Long = System.currentTimeMillis(),
    val sealedAt: Long? = null,
    val syncedAt: Long? = null,
    val itemsCount: Int = 0
)
