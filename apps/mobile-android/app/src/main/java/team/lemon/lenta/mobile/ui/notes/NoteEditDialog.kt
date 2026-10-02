package team.lemon.lenta.mobile.ui.notes

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.PushPin
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import team.lemon.lenta.mobile.data.model.KeepColor
import team.lemon.lenta.mobile.data.model.NoteType
import team.lemon.lenta.mobile.data.model.NoteWithTodos
import team.lemon.lenta.mobile.ui.theme.*

@Composable
fun NoteEditDialog(
    initialNote: NoteWithTodos?,
    initialType: NoteType = NoteType.TEXT,
    onDismiss: () -> Unit,
    onSaveTextNote: (id: String?, title: String, content: String, color: String, isPinned: Boolean) -> Unit,
    onSaveTodoNote: (id: String?, title: String, items: List<Pair<String, Boolean>>, color: String, isPinned: Boolean) -> Unit,
    onDeleteNote: ((id: String) -> Unit)? = null
) {
    var title by remember { mutableStateOf(initialNote?.note?.title ?: "") }
    var content by remember { mutableStateOf(initialNote?.note?.content ?: "") }
    var colorId by remember { mutableStateOf(initialNote?.note?.color ?: KeepColor.DEFAULT.id) }
    var isPinned by remember { mutableStateOf(initialNote?.note?.isPinned ?: false) }
    val noteType = initialNote?.note?.type ?: initialType

    // For Todo lists: mutable list of (text, isDone)
    val todoItems = remember {
        mutableStateListOf<Pair<String, Boolean>>().apply {
            if (initialNote != null && initialNote.todos.isNotEmpty()) {
                addAll(initialNote.todos.sortedBy { it.orderIndex }.map { it.text to it.isDone })
            } else if (noteType == NoteType.TODO) {
                add("" to false)
            }
        }
    }

    var newTodoText by remember { mutableStateOf("") }
    val currentKeepColor = KeepColor.fromId(colorId)

    Dialog(
        onDismissRequest = {
            // Auto-save on dismiss if has content
            if (title.isNotBlank() || content.isNotBlank() || todoItems.any { it.first.isNotBlank() }) {
                if (noteType == NoteType.TODO) {
                    val filtered = todoItems.filter { it.first.isNotBlank() }
                    onSaveTodoNote(initialNote?.note?.id, title, filtered, colorId, isPinned)
                } else {
                    onSaveTextNote(initialNote?.note?.id, title, content, colorId, isPinned)
                }
            }
            onDismiss()
        },
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 16.dp),
            shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
            color = currentKeepColor.cardBackground
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                // Top Action Bar: Back/Close, Pin, Delete, Save
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = {
                        // Save and close
                        if (noteType == NoteType.TODO) {
                            val filtered = todoItems.filter { it.first.isNotBlank() }
                            onSaveTodoNote(initialNote?.note?.id, title, filtered, colorId, isPinned)
                        } else {
                            onSaveTextNote(initialNote?.note?.id, title, content, colorId, isPinned)
                        }
                        onDismiss()
                    }) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Save and Close",
                            tint = Slate50
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        // Pin Toggle
                        IconButton(onClick = { isPinned = !isPinned }) {
                            Icon(
                                imageVector = if (isPinned) Icons.Filled.PushPin else Icons.Outlined.PushPin,
                                contentDescription = "Pin",
                                tint = if (isPinned) LemonYellow else Slate400
                            )
                        }

                        // Delete button (if existing note)
                        if (initialNote != null && onDeleteNote != null) {
                            IconButton(onClick = {
                                onDeleteNote(initialNote.note.id)
                                onDismiss()
                            }) {
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = "Delete",
                                    tint = Slate400
                                )
                            }
                        }
                    }
                }

                // Title Input
                TextField(
                    value = title,
                    onValueChange = { title = it },
                    placeholder = {
                        Text(
                            text = "Title",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = Slate400
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent,
                        focusedTextColor = Slate50,
                        unfocusedTextColor = Slate50
                    ),
                    textStyle = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Bold,
                        color = Slate50
                    ),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Content area
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                ) {
                    if (noteType == NoteType.TODO) {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            itemsIndexed(todoItems) { index, item ->
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Checkbox(
                                        checked = item.second,
                                        onCheckedChange = { isChecked ->
                                            todoItems[index] = item.first to isChecked
                                        },
                                        colors = CheckboxDefaults.colors(
                                            checkedColor = LemonYellow,
                                            uncheckedColor = Slate400,
                                            checkmarkColor = Color.Black
                                        )
                                    )

                                    TextField(
                                        value = item.first,
                                        onValueChange = { newText ->
                                            todoItems[index] = newText to item.second
                                        },
                                        placeholder = { Text("List item", color = Slate400) },
                                        modifier = Modifier.weight(1f),
                                        colors = TextFieldDefaults.colors(
                                            focusedContainerColor = Color.Transparent,
                                            unfocusedContainerColor = Color.Transparent,
                                            focusedIndicatorColor = Color.Transparent,
                                            unfocusedIndicatorColor = Color.Transparent,
                                            focusedTextColor = if (item.second) Slate400 else Slate50,
                                            unfocusedTextColor = if (item.second) Slate400 else Slate50
                                        ),
                                        textStyle = MaterialTheme.typography.bodyMedium.copy(
                                            textDecoration = if (item.second) TextDecoration.LineThrough else null
                                        )
                                    )

                                    IconButton(
                                        onClick = { todoItems.removeAt(index) },
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Close,
                                            contentDescription = "Remove",
                                            tint = Slate400,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                }
                            }

                            // Add new item row
                            item {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(top = 8.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Add,
                                        contentDescription = "Add",
                                        tint = LemonYellow,
                                        modifier = Modifier.padding(start = 12.dp, end = 12.dp)
                                    )

                                    TextField(
                                        value = newTodoText,
                                        onValueChange = { newTodoText = it },
                                        placeholder = { Text("+ List item", color = Slate400) },
                                        modifier = Modifier.weight(1f),
                                        colors = TextFieldDefaults.colors(
                                            focusedContainerColor = Color.Transparent,
                                            unfocusedContainerColor = Color.Transparent,
                                            focusedIndicatorColor = Color.Transparent,
                                            unfocusedIndicatorColor = Color.Transparent,
                                            focusedTextColor = Slate50,
                                            unfocusedTextColor = Slate50
                                        )
                                    )

                                    if (newTodoText.isNotBlank()) {
                                        IconButton(onClick = {
                                            todoItems.add(newTodoText.trim() to false)
                                            newTodoText = ""
                                        }) {
                                            Icon(
                                                imageVector = Icons.Default.Check,
                                                contentDescription = "Confirm",
                                                tint = LemonYellow
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        // Text note editor
                        TextField(
                            value = content,
                            onValueChange = { content = it },
                            placeholder = { Text("Note...", color = Slate400, fontSize = 16.sp) },
                            modifier = Modifier.fillMaxSize(),
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = Color.Transparent,
                                unfocusedContainerColor = Color.Transparent,
                                focusedIndicatorColor = Color.Transparent,
                                unfocusedIndicatorColor = Color.Transparent,
                                focusedTextColor = Slate50,
                                unfocusedTextColor = Slate50
                            ),
                            textStyle = MaterialTheme.typography.bodyLarge.copy(color = Slate50)
                        )
                    }
                }

                // Bottom: Color Picker
                KeepColorPicker(
                    selectedColorId = colorId,
                    onColorSelected = { colorId = it },
                    modifier = Modifier.padding(vertical = 4.dp)
                )
            }
        }
    }
}
