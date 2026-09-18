package team.lemon.lenta.mobile.ui.share

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import team.lemon.lenta.mobile.data.preferences.SettingsManager
import team.lemon.lenta.mobile.data.repository.ShareRepository
import team.lemon.lenta.mobile.ui.theme.LemonLentaTheme
import java.net.URI
import java.util.regex.Pattern

class ShareActivity : ComponentActivity() {

    private lateinit var repository: ShareRepository
    private lateinit var settingsManager: SettingsManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        repository = ShareRepository(this)
        settingsManager = SettingsManager(this)

        val (initialUrl, initialTitle) = extractSharedContent(intent)

        if (initialUrl.isBlank()) {
            Toast.makeText(this, "No valid link found in shared content", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        setContent {
            LemonLentaTheme {
                val settings by settingsManager.settingsFlow.collectAsState(initial = null)

                if (settings != null) {
                    ShareScreen(
                        initialUrl = initialUrl,
                        initialTitle = initialTitle,
                        defaultFolder = settings!!.defaultFolder,
                        containerId = settings!!.containerId,
                        defaultTemplateId = settings!!.defaultTemplateId,
                        isOnline = repository.isOnline(),
                        onDismiss = { finish() },
                        onSave = { url, title, notes, folder, container, templateId, tags ->
                            lifecycleScope.launch {
                                val (savedOnline, message) = repository.saveShare(
                                    url = url,
                                    title = title,
                                    notes = notes,
                                    folder = folder,
                                    containerId = container,
                                    templateId = templateId,
                                    tags = tags
                                )
                                Toast.makeText(this@ShareActivity, message, Toast.LENGTH_SHORT).show()
                                finish()
                            }
                        }
                    )
                }
            }
        }
    }

    private fun extractSharedContent(intent: Intent?): Pair<String, String> {
        if (intent == null || intent.action != Intent.ACTION_SEND) {
            return Pair("", "")
        }

        val extraText = intent.getStringExtra(Intent.EXTRA_TEXT) ?: ""
        val extraSubject = intent.getStringExtra(Intent.EXTRA_SUBJECT) ?: ""

        val urlPattern = Pattern.compile("https?://[\\w\\d:#@%/;$()~_?\\+-=\\\\.&]+")
        val matcher = urlPattern.matcher(extraText)

        var foundUrl = ""
        var remainingText = extraText

        if (matcher.find()) {
            foundUrl = matcher.group()
            remainingText = extraText.replace(foundUrl, "").trim()
        }

        var title = extraSubject.ifBlank { remainingText }
        if (title.isBlank() && foundUrl.isNotBlank()) {
            title = try {
                val uri = URI(foundUrl)
                uri.host ?: foundUrl
            } catch (e: Exception) {
                foundUrl
            }
        }

        return Pair(foundUrl, title)
    }
}
