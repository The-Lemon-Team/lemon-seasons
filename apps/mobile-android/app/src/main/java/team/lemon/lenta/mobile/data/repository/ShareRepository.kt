package team.lemon.lenta.mobile.data.repository

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import androidx.work.*
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import team.lemon.lenta.mobile.data.local.AppDatabase
import team.lemon.lenta.mobile.data.model.PendingShare
import team.lemon.lenta.mobile.data.model.QuickShareRequest
import team.lemon.lenta.mobile.data.model.ShareTemplate
import team.lemon.lenta.mobile.data.model.SyncStatus
import team.lemon.lenta.mobile.data.preferences.SettingsManager
import team.lemon.lenta.mobile.data.remote.ApiClient
import team.lemon.lenta.mobile.worker.SyncWorker
import java.util.concurrent.TimeUnit

class ShareRepository(private val context: Context) {

    private val db = AppDatabase.getInstance(context)
    private val dao = db.pendingShareDao()
    private val settingsManager = SettingsManager(context)
    private val gson = Gson()

    val allSharesFlow: Flow<List<PendingShare>> = dao.getAllSharesFlow()
    val pendingCountFlow: Flow<Int> = dao.getPendingCountFlow()

    fun isOnline(): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
        val activeNetwork = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(activeNetwork) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    suspend fun saveShare(
        url: String,
        title: String,
        notes: String,
        folder: String,
        containerId: String,
        templateId: String,
        tags: List<String>
    ): Pair<Boolean, String> = withContext(Dispatchers.IO) {
        val template = ShareTemplate.getById(templateId)
        val formattedBody = template.apply(title, url, notes, folder)
        val tagsJson = gson.toJson(tags)

        val pending = PendingShare(
            url = url,
            title = title,
            description = formattedBody,
            folder = folder,
            containerId = containerId,
            tagsJson = tagsJson,
            status = SyncStatus.PENDING
        )

        dao.insert(pending)

        val settings = settingsManager.getSettings()
        val online = isOnline()

        if (online) {
            try {
                dao.updateStatus(pending.id, SyncStatus.SYNCING)
                val api = ApiClient.getService(settings.serverUrl, settings.userKey)
                val response = api.quickShare(
                    QuickShareRequest(
                        url = url,
                        title = title,
                        description = formattedBody,
                        folder = folder,
                        containerId = containerId,
                        tags = tags,
                        userKey = settings.userKey.ifBlank { null },
                        template = templateId
                    )
                )

                if (response.isSuccessful && response.body()?.success == true) {
                    dao.updateStatus(pending.id, SyncStatus.SYNCED)
                    return@withContext Pair(true, "Saved to $folder")
                } else {
                    val error = "Server returned ${response.code()}: ${response.message()}"
                    dao.updateStatus(pending.id, SyncStatus.FAILED, error)
                    scheduleBackgroundSync()
                    return@withContext Pair(false, "Saved locally (will sync when online)")
                }
            } catch (e: Exception) {
                dao.updateStatus(pending.id, SyncStatus.FAILED, e.localizedMessage)
                scheduleBackgroundSync()
                return@withContext Pair(false, "Saved locally (${e.message ?: "offline"})")
            }
        } else {
            scheduleBackgroundSync()
            return@withContext Pair(false, "Saved locally (no internet)")
        }
    }

    suspend fun syncPendingItems(): Int = withContext(Dispatchers.IO) {
        val pendingItems = dao.getPendingShares()
        if (pendingItems.isEmpty()) return@withContext 0

        val settings = settingsManager.getSettings()
        val api = ApiClient.getService(settings.serverUrl, settings.userKey)
        var syncedCount = 0

        val listType = object : TypeToken<List<String>>() {}.type

        for (item in pendingItems) {
            try {
                dao.updateStatus(item.id, SyncStatus.SYNCING)
                val tags: List<String> = try {
                    gson.fromJson(item.tagsJson, listType) ?: listOf("mobile", "shared")
                } catch (e: Exception) {
                    listOf("mobile", "shared")
                }

                val response = api.quickShare(
                    QuickShareRequest(
                        url = item.url,
                        title = item.title,
                        description = item.description,
                        folder = item.folder,
                        containerId = item.containerId,
                        tags = tags,
                        userKey = settings.userKey.ifBlank { null }
                    )
                )

                if (response.isSuccessful && response.body()?.success == true) {
                    dao.updateStatus(item.id, SyncStatus.SYNCED)
                    syncedCount++
                } else {
                    dao.updateStatus(item.id, SyncStatus.FAILED, "HTTP ${response.code()}")
                }
            } catch (e: Exception) {
                dao.updateStatus(item.id, SyncStatus.FAILED, e.localizedMessage)
            }
        }

        return@withContext syncedCount
    }

    suspend fun testConnection(baseUrl: String, userKey: String): Pair<Boolean, String> = withContext(Dispatchers.IO) {
        try {
            val api = ApiClient.getService(baseUrl, userKey)
            if (userKey.isNotBlank()) {
                val validateResp = api.validateKey(userKey)
                if (validateResp.isSuccessful && validateResp.body()?.valid == true) {
                    val keyName = validateResp.body()?.name ?: "Valid Key"
                    return@withContext Pair(true, "Connected & Key Verified: $keyName")
                } else {
                    return@withContext Pair(false, "Server reachable, but User Key is invalid or revoked")
                }
            } else {
                val healthResp = api.healthCheck()
                if (healthResp.isSuccessful) {
                    return@withContext Pair(true, "Server connected (Open mode)")
                } else {
                    return@withContext Pair(false, "Server error HTTP ${healthResp.code()}")
                }
            }
        } catch (e: Exception) {
            return@withContext Pair(false, "Connection failed: ${e.localizedMessage ?: e.javaClass.simpleName}")
        }
    }

    suspend fun deleteShare(id: String) = withContext(Dispatchers.IO) {
        dao.deleteById(id)
    }

    suspend fun clearSyncedShares() = withContext(Dispatchers.IO) {
        dao.clearSynced()
    }

    fun scheduleBackgroundSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncWorkRequest = OneTimeWorkRequestBuilder<SyncWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            "lemon_sync_pending",
            ExistingWorkPolicy.APPEND_OR_REPLACE,
            syncWorkRequest
        )
    }
}
