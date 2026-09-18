package team.lemon.lenta.mobile.ui.share

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Link
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import team.lemon.lenta.mobile.data.model.ShareTemplate
import team.lemon.lenta.mobile.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShareScreen(
    initialUrl: String,
    initialTitle: String,
    defaultFolder: String,
    containerId: String,
    defaultTemplateId: String,
    isOnline: Boolean,
    onDismiss: () -> Unit,
    onSave: (url: String, title: String, notes: String, folder: String, container: String, templateId: String, tags: List<String>) -> Unit
) {
    var title by remember { mutableStateOf(initialTitle) }
    var notes by remember { mutableStateOf("") }
    var selectedTemplateId by remember { mutableStateOf(defaultTemplateId) }
    var folderPath by remember { mutableStateOf(defaultFolder) }
    var isSaving by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.55f))
            .clickable(onClick = onDismiss),
        contentAlignment = Alignment.BottomCenter
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(enabled = false) {} // Prevent dismiss when tapping inside card
                .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)),
            colors = CardDefaults.cardColors(containerColor = Slate800),
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                // Header Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "🍋",
                            fontSize = 24.sp,
                            modifier = Modifier.padding(end = 8.dp)
                        )
                        Column {
                            Text(
                                text = "Save to Obsidian",
                                style = MaterialTheme.typography.titleMedium,
                                color = Slate50,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Folder: $folderPath",
                                style = MaterialTheme.typography.labelSmall,
                                color = LemonYellow
                            )
                        }
                    }

                    // Online / Offline Status Badge
                    Surface(
                        color = if (isOnline) SuccessGreen.copy(alpha = 0.15f) else AmberPending.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(12.dp),
                        border = null
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(RoundedCornerShape(3.dp))
                                    .background(if (isOnline) SuccessGreen else AmberPending)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (isOnline) "Online" else "Offline Queue",
                                style = MaterialTheme.typography.labelSmall,
                                color = if (isOnline) SuccessGreen else AmberPending,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // URL Display Pill
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = Slate900,
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Link,
                            contentDescription = null,
                            tint = Slate400,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = initialUrl,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Slate400,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Title Input
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Note Title") },
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

                Spacer(modifier = Modifier.height(12.dp))

                // Template Selector Chips
                Text(
                    text = "Template",
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
                            onClick = { selectedTemplateId = template.id },
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

                Spacer(modifier = Modifier.height(12.dp))

                // Optional Notes Input
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Personal Notes / Thoughts (Optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    maxLines = 4,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = LemonYellow,
                        unfocusedBorderColor = Slate600,
                        focusedTextColor = Slate50,
                        unfocusedTextColor = Slate50,
                        focusedLabelColor = LemonYellow,
                        unfocusedLabelColor = Slate400
                    )
                )

                Spacer(modifier = Modifier.height(18.dp))

                // Action Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Slate400)
                    ) {
                        Text("Cancel")
                    }

                    Button(
                        onClick = {
                            if (!isSaving) {
                                isSaving = true
                                onSave(
                                    initialUrl,
                                    title.ifBlank { initialUrl },
                                    notes,
                                    folderPath,
                                    containerId,
                                    selectedTemplateId,
                                    listOf("mobile", "shared")
                                )
                            }
                        },
                        modifier = Modifier.weight(2f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = LemonYellow,
                            contentColor = Slate900
                        ),
                        enabled = !isSaving
                    ) {
                        if (isSaving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                color = Slate900,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Save to $folderPath",
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}
