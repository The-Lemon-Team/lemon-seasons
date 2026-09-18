package team.lemon.lenta.mobile.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

enum class SyncStatus {
    PENDING,
    SYNCING,
    SYNCED,
    FAILED
}

@Entity(tableName = "pending_shares")
data class PendingShare(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val url: String,
    val title: String,
    val description: String = "",
    val folder: String = "Mobile/Shared",
    val containerId: String = "main-vault",
    val tagsJson: String = "[\"mobile\",\"shared\"]",
    val status: SyncStatus = SyncStatus.PENDING,
    val createdAt: Long = System.currentTimeMillis(),
    val errorMessage: String? = null,
    val retryCount: Int = 0
)
