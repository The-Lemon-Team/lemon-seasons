package team.lemon.lenta.mobile.ui.main

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import team.lemon.lenta.mobile.data.model.PendingShare
import team.lemon.lenta.mobile.data.model.ShareTemplate
import team.lemon.lenta.mobile.data.model.SyncStatus
import team.lemon.lenta.mobile.data.preferences.SettingsManager
import team.lemon.lenta.mobile.data.repository.ShareRepository
import team.lemon.lenta.mobile.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

enum class MainTab {
    QUEUE,
    SETTINGS
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen() {
    val context = LocalContext.current
    val repository = remember { ShareRepository(context) }
    val settingsManager = remember { SettingsManager(context) }
    val scope = rememberCoroutineScope()

    var selectedTab by remember { mutableStateOf(MainTab.QUEUE) }
    val shares by repository.allSharesFlow.collectAsState(initial = emptyList())
    val pendingCount by repository.pendingCountFlow.collectAsState(initial = 0)
    val settings by settingsManager.settingsFlow.collectAsState(initial = null)

    var isSyncing by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = Slate900,
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = "🍋", fontSize = 22.sp, modifier = Modifier.padding(end = 8.dp))
                        Text(
                            text = "Lemon Lenta Clipper",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Slate50
                        )
                    }
                },
                actions = {
                    if (selectedTab == MainTab.QUEUE) {
                        IconButton(
                            onClick = {
                                scope.launch {
                                    isSyncing = true
                                    val synced = repository.syncPendingItems()
                                    isSyncing = false
                                    Toast.makeText(context, "Synced $synced item(s)", Toast.LENGTH_SHORT).show()
                                }
                            },
                            enabled = !isSyncing
                        ) {
                            if (isSyncing) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = LemonYellow,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Icon(
                                    imageVector = Icons.Default.Sync,
                                    contentDescription = "Sync Now",
                                    tint = LemonYellow
                                )
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Slate800)
            )
        },
        bottomBar = {
            NavigationBar(containerColor = Slate800) {
                NavigationBarItem(
                    selected = selectedTab == MainTab.QUEUE,
                    onClick = { selectedTab = MainTab.QUEUE },
                    icon = {
                        BadgedBox(badge = {
                            if (pendingCount > 0) {
                                Badge(containerColor = AmberPending) {
                                    Text(text = "$pendingCount", color = Slate900)
                                }
                            }
                        }) {
                            Icon(Icons.Default.List, contentDescription = "Queue")
                        }
                    },
                    label = { Text("Queue") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Slate900,
                        selectedTextColor = LemonYellow,
                        indicatorColor = LemonYellow,
                        unselectedIconColor = Slate400,
                        unselectedTextColor = Slate400
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == MainTab.SETTINGS,
                    onClick = { selectedTab = MainTab.SETTINGS },
                    icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                    label = { Text("Settings") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Slate900,
                        selectedTextColor = LemonYellow,
                        indicatorColor = LemonYellow,
                        unselectedIconColor = Slate400,
                        unselectedTextColor = Slate400
                    )
                )
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when (selectedTab) {
                MainTab.QUEUE -> QueueTab(
                    shares = shares,
                    pendingCount = pendingCount,
                    isSyncing = isSyncing,
                    onSyncNow = {
                        scope.launch {
                            isSyncing = true
                            val synced = repository.syncPendingItems()
                            isSyncing = false
                            Toast.makeText(context, "Synced $synced item(s)", Toast.LENGTH_SHORT).show()
                        }
                    },
                    onDelete = { id ->
                        scope.launch { repository.deleteShare(id) }
                    },
                    onClearSynced = {
                        scope.launch { repository.clearSyncedShares() }
                    }
                )
                MainTab.SETTINGS -> {
                    settings?.let { currentSettings ->
                        SettingsTab(
                            settings = currentSettings,
                            onSaveServerUrl = { scope.launch { settingsManager.updateServerUrl(it) } },
                            onSaveUserKey = { scope.launch { settingsManager.updateUserKey(it) } },
                            onSaveContainerId = { scope.launch { settingsManager.updateContainerId(it) } },
                            onSaveDefaultFolder = { scope.launch { settingsManager.updateDefaultFolder(it) } },
                            onSaveTemplateId = { scope.launch { settingsManager.updateDefaultTemplateId(it) } },
                            onTestConnection = { url, key -> repository.testConnection(url, key) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun QueueTab(
    shares: List<PendingShare>,
    pendingCount: Int,
    isSyncing: Boolean,
    onSyncNow: () -> Unit,
    onDelete: (String) -> Unit,
    onClearSynced: () -> Unit
) {
    if (shares.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    imageVector = Icons.Default.Share,
                    contentDescription = null,
                    tint = Slate600,
                    modifier = Modifier.size(56.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "No saved links yet",
                    style = MaterialTheme.typography.titleMedium,
                    color = Slate400
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Share any link from Chrome or other apps to save it here!",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Slate600
                )
            }
        }
    } else {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Queue Stats & Action Bar
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Slate800),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Queue Overview",
                                style = MaterialTheme.typography.titleMedium,
                                color = Slate50,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = if (pendingCount > 0) "$pendingCount pending upload" else "All items synced",
                                style = MaterialTheme.typography.labelSmall,
                                color = if (pendingCount > 0) AmberPending else SuccessGreen
                            )
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (pendingCount > 0) {
                                Button(
                                    onClick = onSyncNow,
                                    colors = ButtonDefaults.buttonColors(containerColor = LemonYellow, contentColor = Slate900),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                    shape = RoundedCornerShape(8.dp),
                                    enabled = !isSyncing
                                ) {
                                    Text("Sync Now", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                            TextButton(
                                onClick = onClearSynced,
                                colors = ButtonDefaults.textButtonColors(contentColor = Slate400)
                            ) {
                                Text("Clear Synced", fontSize = 12.sp)
                            }
                        }
                    }
                }
            }

            items(shares, key = { it.id }) { item ->
                ShareItemCard(item = item, onDelete = { onDelete(item.id) })
            }
        }
    }
}

@Composable
fun ShareItemCard(item: PendingShare, onDelete: () -> Unit) {
    val dateStr = remember(item.createdAt) {
        val sdf = SimpleDateFormat("MMM d, HH:mm", Locale.getDefault())
        sdf.format(Date(item.createdAt))
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Slate800),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = item.title,
                        style = MaterialTheme.typography.titleMedium,
                        color = Slate50,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = item.url,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Slate400,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Delete",
                        tint = Slate600,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Folder Tag
                Surface(
                    color = Slate700,
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Folder,
                            contentDescription = null,
                            tint = LemonYellow,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = item.folder,
                            style = MaterialTheme.typography.labelSmall,
                            color = Slate200
                        )
                    }
                }

                // Status Badge
                val (statusText, statusBg, statusColor) = when (item.status) {
                    SyncStatus.SYNCED -> Triple("Synced", SuccessGreen.copy(alpha = 0.15f), SuccessGreen)
                    SyncStatus.SYNCING -> Triple("Syncing…", LemonYellow.copy(alpha = 0.15f), LemonYellow)
                    SyncStatus.PENDING -> Triple("Pending Offline", AmberPending.copy(alpha = 0.15f), AmberPending)
                    SyncStatus.FAILED -> Triple("Offline / Retrying", DangerRed.copy(alpha = 0.15f), DangerRed)
                }

                Surface(
                    color = statusBg,
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = statusText,
                        style = MaterialTheme.typography.labelSmall,
                        color = statusColor,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun SettingsTab(
    settings: team.lemon.lenta.mobile.data.preferences.AppSettings,
    onSaveServerUrl: (String) -> Unit,
    onSaveUserKey: (String) -> Unit,
    onSaveContainerId: (String) -> Unit,
    onSaveDefaultFolder: (String) -> Unit,
    onSaveTemplateId: (String) -> Unit,
    onTestConnection: suspend (String, String) -> Pair<Boolean, String>
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var serverUrl by remember(settings.serverUrl) { mutableStateOf(settings.serverUrl) }
    var userKey by remember(settings.userKey) { mutableStateOf(settings.userKey) }
    var containerId by remember(settings.containerId) { mutableStateOf(settings.containerId) }
    var defaultFolder by remember(settings.defaultFolder) { mutableStateOf(settings.defaultFolder) }
    var selectedTemplateId by remember(settings.defaultTemplateId) { mutableStateOf(settings.defaultTemplateId) }

    var testStatus by remember { mutableStateOf<Pair<Boolean, String>?>(null) }
    var isTesting by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text(
                text = "Backend & Sync Settings",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Slate50
            )
            Text(
                text = "Configure your local server endpoint and user authentication key.",
                style = MaterialTheme.typography.bodyMedium,
                color = Slate400
            )
        }

        // Server URL
        item {
            OutlinedTextField(
                value = serverUrl,
                onValueChange = {
                    serverUrl = it
                    onSaveServerUrl(it)
                },
                label = { Text("Local Server URL") },
                supportingText = { Text("e.g. http://192.168.1.50:3001 or http://10.0.2.2:3001 (emulator)", color = Slate400) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = LemonYellow,
                    unfocusedBorderColor = Slate600,
                    focusedTextColor = Slate50,
                    unfocusedTextColor = Slate50,
                    focusedLabelColor = LemonYellow,
                    unfocusedLabelColor = Slate400
                )
            )
        }

        // User Key
        item {
            OutlinedTextField(
                value = userKey,
                onValueChange = {
                    userKey = it
                    onSaveUserKey(it)
                },
                label = { Text("User Key (Authentication)") },
                supportingText = { Text("e.g. lenta_api_... or lenta_obs_... generated in Admin CMS", color = Slate400) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = LemonYellow,
                    unfocusedBorderColor = Slate600,
                    focusedTextColor = Slate50,
                    unfocusedTextColor = Slate50,
                    focusedLabelColor = LemonYellow,
                    unfocusedLabelColor = Slate400
                )
            )
        }

        // Test Connection Button
        item {
            Button(
                onClick = {
                    scope.launch {
                        isTesting = true
                        testStatus = onTestConnection(serverUrl, userKey)
                        isTesting = false
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Slate700, contentColor = LemonYellow),
                enabled = !isTesting
            ) {
                if (isTesting) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = LemonYellow, strokeWidth = 2.dp)
                } else {
                    Icon(Icons.Default.CloudSync, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Test Connection & Key")
                }
            }

            testStatus?.let { (success, message) ->
                Spacer(modifier = Modifier.height(8.dp))
                Surface(
                    color = if (success) SuccessGreen.copy(alpha = 0.15f) else DangerRed.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = if (success) Icons.Default.CheckCircle else Icons.Default.Error,
                            contentDescription = null,
                            tint = if (success) SuccessGreen else DangerRed,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = message,
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (success) SuccessGreen else DangerRed
                        )
                    }
                }
            }
        }

        item {
            HorizontalDivider(color = Slate700, modifier = Modifier.padding(vertical = 6.dp))
        }

        item {
            Text(
                text = "Obsidian Vault & Folder Settings",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Slate50
            )
        }

        // Target Folder
        item {
            OutlinedTextField(
                value = defaultFolder,
                onValueChange = {
                    defaultFolder = it
                    onSaveDefaultFolder(it)
                },
                label = { Text("Target Mobile Folder") },
                supportingText = { Text("Default: Mobile/Shared (synced directly into Obsidian vault)", color = Slate400) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = LemonYellow,
                    unfocusedBorderColor = Slate600,
                    focusedTextColor = Slate50,
                    unfocusedTextColor = Slate50,
                    focusedLabelColor = LemonYellow,
                    unfocusedLabelColor = Slate400
                )
            )
        }

        // Container ID
        item {
            OutlinedTextField(
                value = containerId,
                onValueChange = {
                    containerId = it
                    onSaveContainerId(it)
                },
                label = { Text("Obsidian Container ID") },
                supportingText = { Text("Default: main-vault (or private container ID)", color = Slate400) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = LemonYellow,
                    unfocusedBorderColor = Slate600,
                    focusedTextColor = Slate50,
                    unfocusedTextColor = Slate50,
                    focusedLabelColor = LemonYellow,
                    unfocusedLabelColor = Slate400
                )
            )
        }

        // Default Template
        item {
            Text(
                text = "Default Note Template",
                style = MaterialTheme.typography.labelSmall,
                color = Slate400,
                modifier = Modifier.padding(bottom = 6.dp)
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ShareTemplate.ALL.forEach { template ->
                    val isSelected = template.id == selectedTemplateId
                    FilterChip(
                        selected = isSelected,
                        onClick = {
                            selectedTemplateId = template.id
                            onSaveTemplateId(template.id)
                        },
                        label = {
                            Text(
                                text = "${template.icon} ${template.name}",
                                style = MaterialTheme.typography.labelSmall
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = LemonYellow,
                            selectedLabelColor = Slate900,
                            containerColor = Slate700,
                            labelColor = Slate200
                        )
                    )
                }
            }
        }
    }
}
