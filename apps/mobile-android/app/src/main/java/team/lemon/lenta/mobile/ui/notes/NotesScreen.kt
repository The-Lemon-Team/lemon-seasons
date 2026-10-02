package team.lemon.lenta.mobile.ui.notes

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.staggeredgrid.LazyVerticalStaggeredGrid
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridCells
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridItemSpan
import androidx.compose.foundation.lazy.staggeredgrid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import team.lemon.lenta.mobile.data.model.NoteType
import team.lemon.lenta.mobile.data.model.NoteWithTodos
import team.lemon.lenta.mobile.data.repository.NotesRepository
import team.lemon.lenta.mobile.ui.theme.*

@Composable
fun NotesScreen(
    repository: NotesRepository,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    val allNotes by repository.allNotesFlow.collectAsState(initial = emptyList())

    var searchQuery by remember { mutableStateOf("") }
    var editingNote by remember { mutableStateOf<NoteWithTodos?>(null) }
    var isCreatingNew by remember { mutableStateOf(false) }
    var createType by remember { mutableStateOf(NoteType.TEXT) }

    // Filter notes
    val filteredNotes = remember(allNotes, searchQuery) {
        if (searchQuery.isBlank()) {
            allNotes
        } else {
            val q = searchQuery.trim().lowercase()
            allNotes.filter { noteWithTodos ->
                noteWithTodos.note.title.lowercase().contains(q) ||
                noteWithTodos.note.content.lowercase().contains(q) ||
                noteWithTodos.todos.any { it.text.lowercase().contains(q) }
            }
        }
    }

    val pinnedNotes = remember(filteredNotes) { filteredNotes.filter { it.note.isPinned } }
    val otherNotes = remember(filteredNotes) { filteredNotes.filter { !it.note.isPinned } }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Slate900)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 12.dp)
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            // Search Bar in Google Keep style
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(24.dp),
                color = Slate800,
                border = null
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Search",
                        tint = Slate400,
                        modifier = Modifier.size(20.dp)
                    )

                    Spacer(modifier = Modifier.width(10.dp))

                    TextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = { Text("Search your notes & todos...", color = Slate400, fontSize = 14.sp) },
                        modifier = Modifier.weight(1f),
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = Color.Transparent,
                            unfocusedContainerColor = Color.Transparent,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent,
                            focusedTextColor = Slate50,
                            unfocusedTextColor = Slate50
                        ),
                        singleLine = true
                    )

                    if (searchQuery.isNotBlank()) {
                        IconButton(
                            onClick = { searchQuery = "" },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Clear",
                                tint = Slate400,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Main Content: Masonry Staggered Grid
            if (filteredNotes.isEmpty()) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.Lightbulb,
                            contentDescription = null,
                            tint = LemonYellow.copy(alpha = 0.5f),
                            modifier = Modifier.size(64.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = if (searchQuery.isBlank()) "Notes and todo lists appear here" else "No notes matching '$searchQuery'",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Slate400
                        )
                    }
                }
            } else {
                LazyVerticalStaggeredGrid(
                    columns = StaggeredGridCells.Fixed(2),
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalItemSpacing = 8.dp,
                    contentPadding = PaddingValues(bottom = 80.dp)
                ) {
                    // PINNED SECTION
                    if (pinnedNotes.isNotEmpty()) {
                        item(span = StaggeredGridItemSpan.FullLine) {
                            Text(
                                text = "PINNED",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = Slate400,
                                modifier = Modifier.padding(start = 4.dp, top = 4.dp, bottom = 4.dp)
                            )
                        }

                        items(pinnedNotes, key = { it.note.id }) { noteWithTodos ->
                            KeepNoteCard(
                                noteWithTodos = noteWithTodos,
                                onClick = { editingNote = noteWithTodos },
                                onTogglePin = {
                                    scope.launch { repository.togglePin(noteWithTodos.note.id) }
                                },
                                onToggleTodo = { todoId, isDone ->
                                    scope.launch { repository.toggleTodoItem(todoId, isDone) }
                                }
                            )
                        }

                        if (otherNotes.isNotEmpty()) {
                            item(span = StaggeredGridItemSpan.FullLine) {
                                Text(
                                    text = "OTHERS",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Slate400,
                                    modifier = Modifier.padding(start = 4.dp, top = 12.dp, bottom = 4.dp)
                                )
                            }
                        }
                    }

                    // OTHERS SECTION
                    items(otherNotes, key = { it.note.id }) { noteWithTodos ->
                        KeepNoteCard(
                            noteWithTodos = noteWithTodos,
                            onClick = { editingNote = noteWithTodos },
                            onTogglePin = {
                                scope.launch { repository.togglePin(noteWithTodos.note.id) }
                            },
                            onToggleTodo = { todoId, isDone ->
                                scope.launch { repository.toggleTodoItem(todoId, isDone) }
                            }
                        )
                    }
                }
            }
        }

        // Bottom Google Keep Quick Create Bar
        Surface(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .height(52.dp),
            shape = RoundedCornerShape(26.dp),
            color = Slate800,
            tonalElevation = 6.dp,
            border = null
        ) {
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // "Take a note..." clickable area
                Row(
                    modifier = Modifier
                        .weight(1f)
                        .clickable {
                            createType = NoteType.TEXT
                            isCreatingNew = true
                        },
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Take a note...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Slate400
                    )
                }

                // Action buttons: Todo checklist button
                IconButton(
                    onClick = {
                        createType = NoteType.TODO
                        isCreatingNew = true
                    },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckBox,
                        contentDescription = "New Todo List",
                        tint = LemonYellow,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }
        }
    }

    // Dialog for Editing Existing Note
    if (editingNote != null) {
        NoteEditDialog(
            initialNote = editingNote,
            onDismiss = { editingNote = null },
            onSaveTextNote = { id, title, content, color, isPinned ->
                scope.launch {
                    repository.saveTextNote(id, title, content, color, isPinned)
                    editingNote = null
                }
            },
            onSaveTodoNote = { id, title, items, color, isPinned ->
                scope.launch {
                    repository.saveTodoNote(id, title, items, color, isPinned)
                    editingNote = null
                }
            },
            onDeleteNote = { id ->
                scope.launch {
                    repository.deleteNote(id)
                    editingNote = null
                }
            }
        )
    }

    // Dialog for Creating New Note
    if (isCreatingNew) {
        NoteEditDialog(
            initialNote = null,
            initialType = createType,
            onDismiss = { isCreatingNew = false },
            onSaveTextNote = { _, title, content, color, isPinned ->
                scope.launch {
                    repository.saveTextNote(null, title, content, color, isPinned)
                    isCreatingNew = false
                }
            },
            onSaveTodoNote = { _, title, items, color, isPinned ->
                scope.launch {
                    repository.saveTodoNote(null, title, items, color, isPinned)
                    isCreatingNew = false
                }
            }
        )
    }
}
