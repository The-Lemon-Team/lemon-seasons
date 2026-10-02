package team.lemon.lenta.mobile.data.model

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(
    tableName = "mobile_todo_items",
    foreignKeys = [
        ForeignKey(
            entity = MobileNote::class,
            parentColumns = ["id"],
            childColumns = ["noteId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["noteId"])]
)
data class MobileTodoItem(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val noteId: String,
    val text: String,
    val isDone: Boolean = false,
    val orderIndex: Int = 0
)
