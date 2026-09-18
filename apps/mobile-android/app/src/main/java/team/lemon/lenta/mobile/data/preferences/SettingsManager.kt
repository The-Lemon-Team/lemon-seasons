package team.lemon.lenta.mobile.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "lenta_settings")

data class AppSettings(
    val serverUrl: String = "http://10.0.2.2:3001",
    val userKey: String = "",
    val containerId: String = "main-vault",
    val defaultFolder: String = "Mobile/Shared",
    val defaultTemplateId: String = "standard",
    val autoSaveEnabled: Boolean = false,
    val autoSaveSeconds: Int = 3
)

class SettingsManager(private val context: Context) {

    private object Keys {
        val SERVER_URL = stringPreferencesKey("server_url")
        val USER_KEY = stringPreferencesKey("user_key")
        val CONTAINER_ID = stringPreferencesKey("container_id")
        val DEFAULT_FOLDER = stringPreferencesKey("default_folder")
        val DEFAULT_TEMPLATE_ID = stringPreferencesKey("default_template_id")
        val AUTO_SAVE_ENABLED = booleanPreferencesKey("auto_save_enabled")
        val AUTO_SAVE_SECONDS = intPreferencesKey("auto_save_seconds")
    }

    val settingsFlow: Flow<AppSettings> = context.dataStore.data.map { prefs ->
        AppSettings(
            serverUrl = prefs[Keys.SERVER_URL] ?: "http://10.0.2.2:3001",
            userKey = prefs[Keys.USER_KEY] ?: "",
            containerId = prefs[Keys.CONTAINER_ID] ?: "main-vault",
            defaultFolder = prefs[Keys.DEFAULT_FOLDER] ?: "Mobile/Shared",
            defaultTemplateId = prefs[Keys.DEFAULT_TEMPLATE_ID] ?: "standard",
            autoSaveEnabled = prefs[Keys.AUTO_SAVE_ENABLED] ?: false,
            autoSaveSeconds = prefs[Keys.AUTO_SAVE_SECONDS] ?: 3
        )
    }

    suspend fun getSettings(): AppSettings {
        return settingsFlow.first()
    }

    suspend fun updateServerUrl(url: String) {
        val cleanUrl = url.trim().trimEnd('/')
        context.dataStore.edit { it[Keys.SERVER_URL] = cleanUrl }
    }

    suspend fun updateUserKey(key: String) {
        context.dataStore.edit { it[Keys.USER_KEY] = key.trim() }
    }

    suspend fun updateContainerId(containerId: String) {
        context.dataStore.edit { it[Keys.CONTAINER_ID] = containerId.trim() }
    }

    suspend fun updateDefaultFolder(folder: String) {
        val cleanFolder = folder.trim().replace('\\', '/').trim('/')
        context.dataStore.edit { it[Keys.DEFAULT_FOLDER] = cleanFolder }
    }

    suspend fun updateDefaultTemplateId(templateId: String) {
        context.dataStore.edit { it[Keys.DEFAULT_TEMPLATE_ID] = templateId }
    }

    suspend fun updateAutoSave(enabled: Boolean, seconds: Int = 3) {
        context.dataStore.edit {
            it[Keys.AUTO_SAVE_ENABLED] = enabled
            it[Keys.AUTO_SAVE_SECONDS] = seconds
        }
    }
}
