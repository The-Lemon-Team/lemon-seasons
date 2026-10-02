package team.lemon.lenta.mobile.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow
import team.lemon.lenta.mobile.data.model.MobileNote
import team.lemon.lenta.mobile.data.model.NoteWithTodos

@Dao
interface MobileNoteDao {

    @Transaction
    @Query("SELECT * FROM mobile_notes WHERE isArchived = 0 ORDER BY isPinned DESC, updatedAt DESC")
    fun getActiveNotesWithTodosFlow(): Flow<List<NoteWithTodos>>

    @Transaction
    @Query("SELECT * FROM mobile_notes WHERE isArchived = 0 AND isPinned = 1 ORDER BY updatedAt DESC")
    fun getPinnedNotesFlow(): Flow<List<NoteWithTodos>>

    @Transaction
    @Query("SELECT * FROM mobile_notes WHERE isArchived = 0 AND isPinned = 0 ORDER BY updatedAt DESC")
    fun getOtherNotesFlow(): Flow<List<NoteWithTodos>>

    @Transaction
    @Query("SELECT * FROM mobile_notes WHERE isArchived = 1 ORDER BY updatedAt DESC")
    fun getArchivedNotesFlow(): Flow<List<NoteWithTodos>>

    @Transaction
    @Query("SELECT * FROM mobile_notes WHERE id = :id")
    suspend fun getNoteWithTodosById(id: String): NoteWithTodos?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(note: MobileNote)

    @Update
    suspend fun update(note: MobileNote)

    @Query("UPDATE mobile_notes SET isPinned = NOT isPinned, updatedAt = :updatedAt WHERE id = :id")
    suspend fun togglePin(id: String, updatedAt: Long = System.currentTimeMillis())

    @Query("UPDATE mobile_notes SET color = :color, updatedAt = :updatedAt WHERE id = :id")
    suspend fun updateColor(id: String, color: String, updatedAt: Long = System.currentTimeMillis())

    @Query("UPDATE mobile_notes SET isArchived = :isArchived, updatedAt = :updatedAt WHERE id = :id")
    suspend fun setArchived(id: String, isArchived: Boolean, updatedAt: Long = System.currentTimeMillis())

    @Query("DELETE FROM mobile_notes WHERE id = :id")
    suspend fun deleteById(id: String)
}
