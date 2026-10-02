package team.lemon.lenta.mobile.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow
import team.lemon.lenta.mobile.data.model.MobileTodoItem

@Dao
interface MobileTodoDao {

    @Query("SELECT * FROM mobile_todo_items WHERE noteId = :noteId ORDER BY orderIndex ASC")
    fun getTodosForNoteFlow(noteId: String): Flow<List<MobileTodoItem>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: MobileTodoItem)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<MobileTodoItem>)

    @Query("UPDATE mobile_todo_items SET isDone = :isDone WHERE id = :id")
    suspend fun updateIsDone(id: String, isDone: Boolean)

    @Query("DELETE FROM mobile_todo_items WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM mobile_todo_items WHERE noteId = :noteId")
    suspend fun deleteByNoteId(noteId: String)
}
