package com.coupleos.app.ui.memories

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.coupleos.app.data.local.entity.MemoryEntity
import com.coupleos.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MemoriesScreen(
    navController: NavController,
    viewModel: MemoriesViewModel = hiltViewModel()
) {
    val memories by viewModel.memories.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    var showCreateDialog by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.feedbackMessage) {
        uiState.feedbackMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearFeedback()
        }
    }

    Scaffold(
        containerColor = Background,
        snackbarHost = {
            SnackbarHost(snackbarHostState) { data ->
                Snackbar(snackbarData = data, containerColor = SurfaceElevated, contentColor = TextPrimary)
            }
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showCreateDialog = true },
                containerColor = Primary,
                contentColor = OnPrimary,
                shape = RoundedCornerShape(16.dp),
            ) { Icon(Icons.Default.Add, "Add memory") }
        },
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier.padding(padding),
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                Text(
                    text = "خاطرات تصویری ما",
                    style = MaterialTheme.typography.headlineMedium,
                    color = TextPrimary,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp),
                )

                if (memories.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize().padding(32.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = "📸", fontSize = 64.sp)
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "هنوز خاطره‌ای ثبت نکردید ❤️",
                                style = MaterialTheme.typography.bodyLarge,
                                color = TextSecondary,
                                textAlign = TextAlign.Center,
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "اولین خاطره‌تون رو ثبت کنید",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Primary,
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(memories, key = { it.id }) { memory ->
                            MemoryCard(memory = memory, onFavoriteToggle = { viewModel.toggleFavorite(memory) })
                        }
                        item { Spacer(modifier = Modifier.height(80.dp)) }
                    }
                }
            }
        }
    }

    if (showCreateDialog) {
        CreateMemoryDialog(
            onDismiss = { showCreateDialog = false },
            onSave = { title, desc, date ->
                viewModel.createMemory(title, desc, date)
                showCreateDialog = false
            }
        )
    }
}

@Composable
private fun MemoryCard(memory: MemoryEntity, onFavoriteToggle: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Surface).padding(16.dp),
    ) {
        Column {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(text = memory.title, style = MaterialTheme.typography.titleMedium, color = TextPrimary, modifier = Modifier.weight(1f))
                IconButton(onClick = onFavoriteToggle, modifier = Modifier.size(32.dp)) {
                    Icon(
                        imageVector = if (memory.isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = "Favorite",
                        tint = if (memory.isFavorite) Primary else TextTertiary,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
            if (memory.description.isNotEmpty()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = memory.description, style = MaterialTheme.typography.bodyMedium, color = TextSecondary, maxLines = 3)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(text = memory.date, style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                if (memory.location.isNotEmpty()) Text(text = "📍 ${memory.location}", style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                Text(
                    text = if (memory.isSynced) "☁️ همگام" else "📱 لوکال",
                    style = MaterialTheme.typography.labelSmall,
                    color = if (memory.isSynced) Success else TextTertiary,
                )
            }
        }
    }
}

@Composable
private fun CreateMemoryDialog(onDismiss: () -> Unit, onSave: (String, String, String) -> Unit) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface,
        title = { Text(text = "خاطره جدید", color = TextPrimary) },
        text = {
            Column {
                OutlinedTextField(
                    value = title, onValueChange = { title = it }, label = { Text("عنوان") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Primary, unfocusedBorderColor = DividerColor, cursorColor = Primary, focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary, focusedLabelColor = Primary, unfocusedLabelColor = TextTertiary),
                    shape = RoundedCornerShape(12.dp),
                )
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = description, onValueChange = { description = it }, label = { Text("توضیحات") },
                    modifier = Modifier.fillMaxWidth(), minLines = 3,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Primary, unfocusedBorderColor = DividerColor, cursorColor = Primary, focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary, focusedLabelColor = Primary, unfocusedLabelColor = TextTertiary),
                    shape = RoundedCornerShape(12.dp),
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { if (title.isNotBlank()) onSave(title, description, java.time.LocalDate.now().toString()) }) { Text("ذخیره", color = Primary) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("انصراف", color = TextSecondary) }
        },
    )
}
