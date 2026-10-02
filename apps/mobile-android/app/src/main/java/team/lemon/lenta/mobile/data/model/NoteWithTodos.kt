package team.lemon.lenta.mobile.data.model

import androidx.room.Embedded
import androidx.room.Relation

data class NoteWithTodos(
    @Embedded
    val note: MobileNote,
    @Relation(
        parentColumn = "id",
        entityColumn = "noteId"
    )
    val todos: List<MobileTodoItem> = emptyList()
)
