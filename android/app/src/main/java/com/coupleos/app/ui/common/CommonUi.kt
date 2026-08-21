package com.coupleos.app.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.coupleos.app.ui.theme.*

/** Simple RTL-friendly header used by every feature screen. */
@Composable
fun FeatureHeader(
    title: String,
    subtitle: String? = null,
    onBack: (() -> Unit)? = null,
    trailing: @Composable (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (onBack != null) {
            IconButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "بازگشت",
                    tint = TextPrimary,
                )
            }
        } else {
            Spacer(modifier = Modifier.width(8.dp))
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                color = TextPrimary,
            )
            if (!subtitle.isNullOrBlank()) {
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.labelMedium,
                    color = TextTertiary,
                )
            }
        }
        trailing?.invoke()
    }
}

/**
 * Standard screen wrapper: header + snackbar + optional FAB.
 */
@Composable
fun FeatureScaffold(
    title: String,
    onBack: (() -> Unit)?,
    subtitle: String? = null,
    snackbarHostState: SnackbarHostState = SnackbarHostState(),
    onFabClick: (() -> Unit)? = null,
    fabIcon: @Composable (() -> Unit)? = null,
    headerTrailing: @Composable (() -> Unit)? = null,
    content: @Composable (PaddingValues) -> Unit,
) {
    Scaffold(
        containerColor = Background,
        snackbarHost = {
            SnackbarHost(snackbarHostState) { data ->
                Snackbar(
                    snackbarData = data,
                    containerColor = SurfaceElevated,
                    contentColor = TextPrimary,
                )
            }
        },
        topBar = {
            FeatureHeader(
                title = title,
                subtitle = subtitle,
                onBack = onBack,
                trailing = headerTrailing,
            )
        },
        floatingActionButton = {
            if (onFabClick != null) {
                FloatingActionButton(
                    onClick = onFabClick,
                    containerColor = Primary,
                    contentColor = OnPrimary,
                    shape = RoundedCornerShape(16.dp),
                ) {
                    fabIcon?.invoke()
                }
            }
        },
        content = content,
    )
}

@Composable
fun EmptyState(
    emoji: String,
    title: String,
    subtitle: String? = null,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = emoji, fontSize = 56.sp)
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                color = TextSecondary,
                textAlign = TextAlign.Center,
            )
            if (!subtitle.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Primary,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
fun CoupleCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val base = modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(16.dp))
        .background(Surface)
    Column(
        modifier = if (onClick != null) base.clickable(onClick = onClick).padding(16.dp) else base.padding(16.dp),
        content = content,
    )
}

@Composable
fun CoupleTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    minLines: Int = 1,
    singleLine: Boolean = false,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        modifier = modifier.fillMaxWidth(),
        minLines = minLines,
        singleLine = singleLine,
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Primary,
            unfocusedBorderColor = DividerColor,
            cursorColor = Primary,
            focusedTextColor = TextPrimary,
            unfocusedTextColor = TextPrimary,
            focusedLabelColor = Primary,
            unfocusedLabelColor = TextTertiary,
        ),
    )
}

/** Small "synced / local only" indicator so the user can SEE persistence working. */
@Composable
fun SyncBadge(isSynced: Boolean) {
    Text(
        text = if (isSynced) "☁️ روی توکن" else "📱 فقط لوکال",
        style = MaterialTheme.typography.labelSmall,
        color = if (isSynced) Success else TextTertiary,
    )
}

@Composable
fun CoupleDialog(
    title: String,
    confirmText: String = "ذخیره",
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
    confirmEnabled: Boolean = true,
    content: @Composable ColumnScope.() -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface,
        title = { Text(text = title, color = TextPrimary) },
        text = { Column(content = content) },
        confirmButton = {
            TextButton(onClick = onConfirm, enabled = confirmEnabled) {
                Text(confirmText, color = if (confirmEnabled) Primary else TextTertiary)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("انصراف", color = TextSecondary) }
        },
    )
}

@Composable
fun StatChip(label: String, value: String) {
    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(14.dp))
            .background(SurfaceElevated)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(text = value, style = MaterialTheme.typography.titleMedium, color = Primary)
        Text(text = label, style = MaterialTheme.typography.labelSmall, color = TextTertiary)
    }
}

@Composable
fun LabeledSlider(
    label: String,
    value: Int,
    range: ClosedFloatingPointRange<Float> = 1f..10f,
    steps: Int = 8,
    onValueChange: (Int) -> Unit,
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(text = label, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
            Text(text = value.toString(), style = MaterialTheme.typography.bodyMedium, color = Primary)
        }
        Slider(
            value = value.toFloat(),
            onValueChange = { onValueChange(it.toInt()) },
            valueRange = range,
            steps = steps,
            colors = SliderDefaults.colors(
                thumbColor = Primary,
                activeTrackColor = Primary,
                inactiveTrackColor = DividerColor,
            ),
        )
    }
}
