package com.coupleos.app.ui.journal

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Book
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.coupleos.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JournalScreen(
    onBack: () -> Unit = {},
    viewModel: JournalViewModel = hiltViewModel()
) {
    val entries by viewModel.entries.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    var showDialog by remember { mutableStateOf(false) }
    var filterPrivacy by remember { mutableStateOf("ALL") } // ALL, PRIVATE, SHARED

    val filtered = when (filterPrivacy) {
        "PRIVATE" -> entries.filter { it.privacy == "PRIVATE" }
        "SHARED" -> entries.filter { it.privacy == "SHARED" }
        else -> entries
    }

    Scaffold(
        containerColor = Background,
        topBar = {
            TopAppBar(
                title = { Text("دفتر خاطرات 📓", color = TextPrimary) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface),
                actions = {
                    if (uiState.isRefreshing) CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Primary, strokeWidth = 2.dp)
                    else IconButton(onClick = { viewModel.refresh() }) { Text("⟳", color = Primary, fontSize = 18.sp) }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showDialog = true }, containerColor = Primary) {
                Icon(Icons.Default.Add, contentDescription = "Add", tint = OnPrimary)
            }
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            // Filter chips
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = filterPrivacy == "ALL", onClick = { filterPrivacy = "ALL" }, label = { Text("همه") })
                FilterChip(selected = filterPrivacy == "PRIVATE", onClick = { filterPrivacy = "PRIVATE" }, label = { Text("خصوصی") })
                FilterChip(selected = filterPrivacy == "SHARED", onClick = { filterPrivacy = "SHARED" }, label = { Text("مشترک") })
            }
            Spacer(Modifier.height(12.dp))
            if (uiState.feedbackMessage != null) {
                Card(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)), colors = CardDefaults.cardColors(containerColor = PrimaryContainer)) {
                    Text(uiState.feedbackMessage!!, modifier = Modifier.padding(12.dp), color = TextPrimary, textAlign = TextAlign.Center)
                }
                Spacer(Modifier.height(12.dp))
            }
            if (filtered.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Book, contentDescription = null, modifier = Modifier.size(48.dp), tint = TextTertiary)
                        Spacer(Modifier.height(8.dp))
                        Text("هنوز یادداشتی ننوشتید ❤️", color = TextTertiary)
                        Text("هر چی تو دلته اینجا بنویس — روی توکن ذخیره میشه", style = MaterialTheme.typography.bodySmall, color = TextTertiary, textAlign = TextAlign.Center)
                    }
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(filtered, key = { it.id }) { entry ->
                        Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(16.dp)) {
                            Column(Modifier.padding(16.dp)) {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(entry.title, style = MaterialTheme.typography.titleSmall, color = TextPrimary)
                                    Text(if (entry.privacy == "PRIVATE") "🔒 خصوصی" else "💞 مشترک", style = MaterialTheme.typography.labelSmall, color = Primary)
                                }
                                Spacer(Modifier.height(6.dp))
                                Text(entry.content, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                                Spacer(Modifier.height(8.dp))
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Text(entry.date, style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                                    if (viewModel.isReadOnly(entry.id)) Text("از توکن پارتنر 👁️ فقط خواندنی", style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                                    else TextButton(onClick = { viewModel.deleteEntry(entry.id) }) { Text("حذف", color = Danger) }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showDialog) {
        var title by remember { mutableStateOf("") }
        var content by remember { mutableStateOf("") }
        var privacy by remember { mutableStateOf("PRIVATE") }
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = { Text("یادداشت جدید") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("عنوان") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = content, onValueChange = { content = it }, label = { Text("متن") }, minLines = 3, modifier = Modifier.fillMaxWidth())
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(selected = privacy == "PRIVATE", onClick = { privacy = "PRIVATE" }, label = { Text("🔒 خصوصی") })
                        FilterChip(selected = privacy == "SHARED", onClick = { privacy = "SHARED" }, label = { Text("💞 مشترک") })
                    }
                    Text("ذخیره روی توکن انجام میشه و پارتنرت میتونه مشترک‌ها رو ببینه", style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (title.isNotBlank() && content.isNotBlank()) {
                        viewModel.createEntry(title, content, "", privacy)
                        showDialog = false
                    }
                }, colors = ButtonDefaults.buttonColors(containerColor = Primary)) { Text("ذخیره") }
            },
            dismissButton = { TextButton(onClick = { showDialog = false }) { Text("انصراف") } }
        )
    }
}
