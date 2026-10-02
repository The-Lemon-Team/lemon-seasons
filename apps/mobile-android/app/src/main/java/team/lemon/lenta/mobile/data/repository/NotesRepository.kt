package team.lemon.lenta.mobile.data.repository

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import team.lemon.lenta.mobile.data.local.AppDatabase
import team.lemon.lenta.mobile.data.model.*
import java.util.UUID

class NotesRepository(private val context: Context) {

    private val db = AppDatabase.getInstance(context)
    private val noteDao = db.mobileNoteDao()
    private val todoDao = db.mobileTodoDao()
    private val sessionDao = db.mobileSessionDao()

    val allNotesFlow: Flow<List<NoteWithTodos>> = noteDao.getActiveNotesWithTodosFlow()
    val pinnedNotesFlow: Flow<List<NoteWithTodos>> = noteDao.getPinnedNotesFlow()
    val otherNotesFlow: Flow<List<NoteWithTodos>> = noteDao.getOtherNotesFlow()

    suspend fun getOrCreateActiveSessionId(): String = withContext(Dispatchers.IO) {
        val active = sessionDao.getActiveSession()
        if (active != null) {
            return@withContext active.id
        }
        val newSession = MobileSession(
            title = "Mobile Draft Session (${System.currentTimeMillis()})"
        )
        sessionDao.insert(newSession)
        newSession.id
    }

    suspend fun saveTextNote(
        id: String? = null,
        title: String,
        content: String,
        color: String = KeepColor.DEFAULT.id,
        isPinned: Boolean = false
    ): String = withContext(Dispatchers.IO) {
        val sessionId = getOrCreateActiveSessionId()
        val noteId = id ?: UUID.randomUUID().toString()
        val existing = if (id != null) noteDao.getNoteWithTodosById(id) else null

        val note = MobileNote(
            id = noteId,
            sessionId = sessionId,
            title = title.trim(),
            content = content.trim(),
            color = color,
            isPinned = isPinned,
            type = NoteType.TEXT,
            createdAt = existing?.note?.createdAt ?: System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis(),
            syncStatus = SyncStatus.PENDING
        )
        noteDao.insert(note)
        noteId
    }

    suspend fun saveTodoNote(
        id: String? = null,
        title: String,
        items: List<Pair<String, Boolean>>, // (text, isDone)
        color: String = KeepColor.DEFAULT.id,
        isPinned: Boolean = false
    ): String = withContext(Dispatchers.IO) {
        val sessionId = getOrCreateActiveSessionId()
        val noteId = id ?: UUID.randomUUID().toString()
        val existing = if (id != null) noteDao.getNoteWithTodosById(id) else null

        val note = MobileNote(
            id = noteId,
            sessionId = sessionId,
            title = title.trim(),
            content = "",
            color = color,
            isPinned = isPinned,
            type = NoteType.TODO,
            createdAt = existing?.note?.createdAt ?: System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis(),
            syncStatus = SyncStatus.PENDING
        )
        noteDao.insert(note)

        // Replace todo items
        todoDao.deleteByNoteId(noteId)
        val todoEntities = items.mapIndexed { index, (text, isDone) ->
            MobileTodoItem(
                noteId = noteId,
                text = text.trim(),
                isDone = isDone,
                orderIndex = index
            )
        }
        if (todoEntities.isNotEmpty()) {
            todoDao.insertAll(todoEntities)
        }

        noteId
    }

    suspend fun toggleTodoItem(todoId: String, isDone: Boolean) = withContext(Dispatchers.IO) {
        todoDao.updateIsDone(todoId, isDone)
    }

    suspend fun togglePin(noteId: String) = withContext(Dispatchers.IO) {
        noteDao.togglePin(noteId)
    }

    suspend fun updateNoteColor(noteId: String, colorId: String) = withContext(Dispatchers.IO) {
        noteDao.updateColor(noteId, colorId)
    }

    suspend fun archiveNote(noteId: String) = withContext(Dispatchers.IO) {
        noteDao.setArchived(noteId, true)
    }

    suspend fun deleteNote(noteId: String) = withContext(Dispatchers.IO) {
        noteDao.deleteById(noteId)
    }
}
