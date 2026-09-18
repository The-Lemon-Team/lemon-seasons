package team.lemon.lenta.mobile.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow
import team.lemon.lenta.mobile.data.model.PendingShare
import team.lemon.lenta.mobile.data.model.SyncStatus

@Dao
interface PendingShareDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(share: PendingShare)

    @Update
    suspend fun update(share: PendingShare)

    @Query("UPDATE pending_shares SET status = :status, errorMessage = :error, retryCount = retryCount + 1 WHERE id = :id")
    suspend fun updateStatus(id: String, status: SyncStatus, error: String? = null)

    @Query("SELECT * FROM pending_shares WHERE status IN ('PENDING', 'FAILED') ORDER BY createdAt ASC")
    suspend fun getPendingShares(): List<PendingShare>

    @Query("SELECT * FROM pending_shares ORDER BY createdAt DESC")
    fun getAllSharesFlow(): Flow<List<PendingShare>>

    @Query("SELECT COUNT(*) FROM pending_shares WHERE status IN ('PENDING', 'FAILED')")
    fun getPendingCountFlow(): Flow<Int>

    @Delete
    suspend fun delete(share: PendingShare)

    @Query("DELETE FROM pending_shares WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM pending_shares WHERE status = 'SYNCED'")
    suspend fun clearSynced()
}
