package team.lemon.lenta.mobile.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow
import team.lemon.lenta.mobile.data.model.MobileSession

@Dao
interface MobileSessionDao {

    @Query("SELECT * FROM mobile_sessions WHERE status = 'ACTIVE' ORDER BY createdAt DESC LIMIT 1")
    suspend fun getActiveSession(): MobileSession?

    @Query("SELECT * FROM mobile_sessions ORDER BY createdAt DESC")
    fun getAllSessionsFlow(): Flow<List<MobileSession>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(session: MobileSession)

    @Update
    suspend fun update(session: MobileSession)

    @Query("UPDATE mobile_sessions SET status = 'SEALED', sealedAt = :sealedAt WHERE id = :id")
    suspend fun sealSession(id: String, sealedAt: Long = System.currentTimeMillis())

    @Query("UPDATE mobile_sessions SET status = 'SYNCED', syncedAt = :syncedAt WHERE id = :id")
    suspend fun markSynced(id: String, syncedAt: Long = System.currentTimeMillis())
}
