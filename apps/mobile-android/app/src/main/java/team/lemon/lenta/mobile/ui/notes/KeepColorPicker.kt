package team.lemon.lenta.mobile.ui.notes

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import team.lemon.lenta.mobile.data.model.KeepColor
import team.lemon.lenta.mobile.ui.theme.LemonYellow

@Composable
fun KeepColorPicker(
    selectedColorId: String,
    onColorSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()

    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(scrollState)
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        KeepColor.entries.forEach { keepColor ->
            val isSelected = keepColor.id.equals(selectedColorId, ignoreCase = true)

            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(keepColor.cardBackground)
                    .border(
                        width = if (isSelected) 2.dp else 1.dp,
                        color = if (isSelected) LemonYellow else keepColor.borderColor,
                        shape = CircleShape
                    )
                    .clickable { onColorSelected(keepColor.id) },
                contentAlignment = Alignment.Center
            ) {
                if (isSelected) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = "Selected",
                        tint = LemonYellow,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}
