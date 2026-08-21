package com.coupleos.app.ui.journal

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.JournalDao
import com.coupleos.app.data.local.entity.JournalEntity
import com.coupleos.app.data.repository.CoupleSyncRepository
import com.coupleos.app.security.crypto.CryptoManager
import com.coupleos.app.security.keystore.SecureStorage
import com.coupleos.app.ui.common.*
import com.coupleos.app.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalDateTime
import javax.inject.Inject

@HiltViewModel
class JournalViewModel @Inject constructor(
    private val journalDao: JournalDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val syncRepository: CoupleSyncRepository,
) : ViewModel() {

    private val _showShared = MutableStateFlow(false)
    val showShared: StateFlow<Boolean> = _showShared

    val entries: StateFlow<List<JournalEntity>> = journalDao.getAllEntries()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _feedback = MutableStateFlow<String?>(null)
    val feedback: StateFlow<String?> = _feedback

    val myUserId: String get() = secureStorage.getUserId().orEmpty()

    fun setShowShared(value: Boolean) { _showShared.value = value }

    fun add(title: String, content: String, mood: String, shared: Boolean) {
        if (content.isBlank()) return
        viewModelScope.launch {
            val now = LocalDateTime.now().toString()
            journalDao.insert(
                JournalEntity(
                    id = cryptoManager.generateId(),
                    title = title.ifBlank { LocalDate.now().toString() },
                    content = content.trim(),
                    mood = mood,
                    date = LocalDate.now().toString(),
                    privacy = if (shared) "SHARED" else "PRIVATE",
                    createdBy = myUserId,
                    createdAt = now,
                    updatedAt = now,
                    isSynced = false,
                )
            )
            val result = syncRepository.push()
            _feedback.value = if (result.ok) "یادداشت ثبت و روی توکن ذخیره شد ✅"
            else "ثبت شد (لوکال) — ${result.message}"
        }
    }

    fun remove(entry: JournalEntity) {
        viewModelScope.launch {
            journalDao.softDelete(entry.id, LocalDateTime.now().toString())
            syncRepository.push()
            _feedback.value = "حذف شد"
        }
    }

    fun clearFeedback() { _feedback.value = null }
}

@Composable
fun JournalScreen(onBack: () -> Unit, viewModel: JournalViewModel = hiltViewModel()) {
    val all by viewModel.entries.collectAsState()
    val showShared by viewModel.showShared.collectAsState()
    val feedback by viewModel.feedback.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showDialog by remember { mutableStateOf(false) }

    LaunchedEffect(feedback) {
        feedback?.let { snackbarHostState.showSnackbar(it); viewModel.clearFeedback() }
    }

    val entries = all.filter {
        if (showShared) it.privacy == "SHARED"
        else it.privacy == "PRIVATE" && it.createdBy == viewModel.myUserId
    }

    FeatureScaffold(
        title = "دفتر خاطرات",
        subtitle = "${entries.size} یادداشت",
        onBack = onBack,
        snackbarHostState = snackbarHostState,
        onFabClick = { showDialog = true },
        fabIcon = { Icon(Icons.Default.Add, contentDescription = "افزودن") },
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            Row(
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FilterChip(selected = !showShared, onClick = { viewModel.setShowShared(false) }, label = { Text("خصوصی من") })
                FilterChip(selected = showShared, onClick = { viewModel.setShowShared(true) }, label = { Text("مشترک") })
            }

            if (entries.isEmpty()) {
                EmptyState("📓", "هنوز یادداشتی ننوشتی", "هرچی توی دلته اینجا بنویس")
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(entries, key = { it.id }) { entry ->
                        CoupleCard {
                            Row(verticalAlignment = Alignment.Top) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        (if (entry.mood.isNotBlank()) "${entry.mood} " else "") + entry.title,
                                        style = MaterialTheme.typography.titleSmall,
                                        color = TextPrimary,
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(entry.content, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Text(entry.date, style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                                        SyncBadge(entry.isSynced)
                                    }
                                }
                                TextButton(onClick = { viewModel.remove(entry) }) {
                                    Text("حذف", color = Danger, style = MaterialTheme.typography.labelSmall)
                                }
                            }
                        }
                    }
                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }
    }

    if (showDialog) {
        var title by remember { mutableStateOf("") }
        var content by remember { mutableStateOf("") }
        var mood by remember { mutableStateOf("") }
        var shared by remember { mutableStateOf(showShared) }

        CoupleDialog(
            title = "یادداشت جدید",
            onDismiss = { showDialog = false },
            onConfirm = { viewModel.add(title, content, mood, shared); showDialog = false },
            confirmEnabled = content.isNotBlank(),
        ) {
            CoupleTextField(title, { title = it }, "عنوان (اختیاری)", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(content, { content = it }, "متن", minLines = 4)
            Spacer(modifier = Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("😊", "🥰", "😐", "😔", "😡", "😴").forEach { e ->
                    FilterChip(selected = mood == e, onClick = { mood = if (mood == e) "" else e }, label = { Text(e) })
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Switch(
                    checked = shared,
                    onCheckedChange = { shared = it },
                    colors = SwitchDefaults.colors(checkedThumbColor = Primary, checkedTrackColor = PrimaryContainer),
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("پارتنرم هم ببینه", color = TextSecondary, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}
