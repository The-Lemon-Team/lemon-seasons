package team.lemon.lenta.mobile.ui.notes

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material.icons.outlined.PushPin
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import team.lemon.lenta.mobile.data.model.KeepColor
import team.lemon.lenta.mobile.data.model.NoteType
import team.lemon.lenta.mobile.data.model.NoteWithTodos
import team.lemon.lenta.mobile.ui.theme.LemonYellow
import team.lemon.lenta.mobile.ui.theme.Slate400
import team.lemon.lenta.mobile.ui.theme.Slate50

@Composable
fun KeepNoteCard(
    noteWithTodos: NoteWithTodos,
    onClick: () -> Unit,
    onTogglePin: () -> Unit,
    onToggleTodo: (todoId: String, isDone: Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    val note = noteWithTodos.note
    val todos = noteWithTodos.todos
    val keepColor = KeepColor.fromId(note.color)

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = keepColor.cardBackground
        ),
        border = BorderStroke(1.dp, keepColor.borderColor.copy(alpha = 0.6f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            // Header: Title & Pin
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                if (note.title.isNotBlank()) {
                    Text(
                        text = note.title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Slate50,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f).padding(end = 4.dp)
                    )
                } else {
                    Spacer(modifier = Modifier.weight(1f))
                }

                IconButton(
                    onClick = onTogglePin,
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(
                        imageVector = if (note.isPinned) Icons.Filled.PushPin else Icons.Outlined.PushPin,
                        contentDescription = if (note.isPinned) "Unpin" else "Pin",
                        tint = if (note.isPinned) LemonYellow else Slate400.copy(alpha = 0.6f),
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Body: Text or Todo Checklist
            if (note.type == NoteType.TODO) {
                val sortedTodos = todos.sortedBy { it.orderIndex }
                val displayTodos = sortedTodos.take(6) // preview up to 6 items

                Column(
                    verticalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    displayTodos.forEach { todo ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 1.dp)
                        ) {
                            Checkbox(
                                checked = todo.isDone,
                                onCheckedChange = { isChecked ->
                                    onToggleTodo(todo.id, isChecked)
                                },
                                modifier = Modifier
                                    .size(20.dp)
                                    .padding(end = 6.dp),
                                colors = CheckboxDefaults.colors(
                                    checkedColor = LemonYellow,
                                    uncheckedColor = Slate400,
                                    checkmarkColor = Color.Black
                                )
                            )

                            Spacer(modifier = Modifier.width(6.dp))

                            Text(
                                text = todo.text,
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (todo.isDone) Slate400 else Slate50,
                                textDecoration = if (todo.isDone) TextDecoration.LineThrough else null,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.alpha(if (todo.isDone) 0.5f else 1f)
                            )
                        }
                    }

                    if (sortedTodos.size > 6) {
                        Text(
                            text = "+ еще ${sortedTodos.size - 6} пунктов...",
                            fontSize = 12.sp,
                            color = Slate400,
                            modifier = Modifier.padding(top = 4.dp, start = 26.dp)
                        )
                    }
                }
            } else {
                // Text Note
                if (note.content.isNotBlank()) {
                    Text(
                        text = note.content,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Slate50.copy(alpha = 0.88f),
                        maxLines = 8,
                        overflow = TextOverflow.Ellipsis,
                        lineHeight = 18.sp
                    )
                }
            }
        }
    }
}
