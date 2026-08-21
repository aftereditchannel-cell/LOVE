package com.coupleos.app.ui.tasks

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.TaskDao
import com.coupleos.app.data.local.entity.TaskEntity
import com.coupleos.app.data.repository.CoupleSyncRepository
import com.coupleos.app.security.crypto.CryptoManager
import com.coupleos.app.security.keystore.SecureStorage
import com.coupleos.app.ui.common.*
import com.coupleos.app.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import javax.inject.Inject

@HiltViewModel
class TasksViewModel @Inject constructor(
    private val taskDao: TaskDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val syncRepository: CoupleSyncRepository,
) : ViewModel() {

    val tasks: StateFlow<List<TaskEntity>> = taskDao.getAllTasks()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _feedback = MutableStateFlow<String?>(null)
    val feedback: StateFlow<String?> = _feedback

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing

    fun addTask(title: String, description: String, priority: String, assignedTo: String) {
        if (title.isBlank()) return
        viewModelScope.launch {
            val now = LocalDateTime.now().toString()
            taskDao.insert(
                TaskEntity(
                    id = cryptoManager.generateId(),
                    title = title.trim(),
                    description = description.trim(),
                    priority = priority,
                    assignedTo = assignedTo,
                    status = "TODO",
                    createdBy = secureStorage.getUserId().orEmpty(),
                    createdAt = now,
                    updatedAt = now,
                    isSynced = false,
                )
            )
            pushToToken("کار جدید اضافه شد")
        }
    }

    fun toggleDone(task: TaskEntity) {
        viewModelScope.launch {
            val now = LocalDateTime.now().toString()
            taskDao.update(
                task.copy(
                    status = if (task.status == "DONE") "TODO" else "DONE",
                    updatedAt = now,
                    isSynced = false,
                )
            )
            pushToToken(null)
        }
    }

    fun deleteTask(task: TaskEntity) {
        viewModelScope.launch {
            taskDao.softDelete(task.id, LocalDateTime.now().toString())
            pushToToken("حذف شد")
        }
    }

    fun syncNow() {
        viewModelScope.launch {
            _isSyncing.value = true
            val result = syncRepository.sync()
            _isSyncing.value = false
            _feedback.value = result.message
        }
    }

    private suspend fun pushToToken(prefix: String?) {
        val result = syncRepository.push()
        _feedback.value = when {
            prefix != null && result.ok -> "$prefix و روی توکن ذخیره شد ✅"
            prefix != null -> "$prefix (لوکال) — ${result.message}"
            result.ok -> null
            else -> result.message
        }
    }

    fun clearFeedback() { _feedback.value = null }
}

@Composable
fun TasksScreen(onBack: () -> Unit, viewModel: TasksViewModel = hiltViewModel()) {
    val tasks by viewModel.tasks.collectAsState()
    val feedback by viewModel.feedback.collectAsState()
    val isSyncing by viewModel.isSyncing.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showDialog by remember { mutableStateOf(false) }

    LaunchedEffect(feedback) {
        feedback?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearFeedback()
        }
    }

    FeatureScaffold(
        title = "کارهای ما",
        subtitle = "${tasks.count { it.status != "DONE" }} کار باز",
        onBack = onBack,
        snackbarHostState = snackbarHostState,
        onFabClick = { showDialog = true },
        fabIcon = { Icon(Icons.Default.Add, contentDescription = "افزودن") },
        headerTrailing = {
            TextButton(onClick = { viewModel.syncNow() }, enabled = !isSyncing) {
                Text(if (isSyncing) "..." else "همگام‌سازی", color = Primary)
            }
        },
    ) { padding ->
        if (tasks.isEmpty()) {
            Box(modifier = Modifier.padding(padding)) {
                EmptyState("✅", "هنوز کاری ثبت نشده", "اولین کار مشترکتون رو اضافه کنید")
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(tasks, key = { it.id }) { task ->
                    CoupleCard {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(
                                checked = task.status == "DONE",
                                onCheckedChange = { viewModel.toggleDone(task) },
                                colors = CheckboxDefaults.colors(
                                    checkedColor = Primary,
                                    uncheckedColor = TextTertiary,
                                ),
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = task.title,
                                    style = MaterialTheme.typography.titleSmall,
                                    color = if (task.status == "DONE") TextTertiary else TextPrimary,
                                    textDecoration = if (task.status == "DONE") TextDecoration.LineThrough else null,
                                )
                                if (task.description.isNotBlank()) {
                                    Text(
                                        text = task.description,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = TextSecondary,
                                    )
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text(
                                        text = priorityLabel(task.priority),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = priorityColor(task.priority),
                                    )
                                    Text(
                                        text = assignmentLabel(task.assignedTo),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = TextTertiary,
                                    )
                                    SyncBadge(task.isSynced)
                                }
                            }
                            TextButton(onClick = { viewModel.deleteTask(task) }) {
                                Text("حذف", color = Danger, style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }

    if (showDialog) {
        var title by remember { mutableStateOf("") }
        var description by remember { mutableStateOf("") }
        var priority by remember { mutableStateOf("MEDIUM") }
        var assignedTo by remember { mutableStateOf("BOTH") }

        CoupleDialog(
            title = "کار جدید",
            onDismiss = { showDialog = false },
            onConfirm = {
                viewModel.addTask(title, description, priority, assignedTo)
                showDialog = false
            },
            confirmEnabled = title.isNotBlank(),
        ) {
            CoupleTextField(title, { title = it }, "عنوان", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(description, { description = it }, "توضیحات", minLines = 2)
            Spacer(modifier = Modifier.height(10.dp))
            Text("اولویت", color = TextSecondary, style = MaterialTheme.typography.labelMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("LOW", "MEDIUM", "HIGH").forEach { level ->
                    FilterChip(
                        selected = priority == level,
                        onClick = { priority = level },
                        label = { Text(priorityLabel(level)) },
                    )
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
            Text("مسئول", color = TextSecondary, style = MaterialTheme.typography.labelMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("ME", "PARTNER", "BOTH").forEach { who ->
                    FilterChip(
                        selected = assignedTo == who,
                        onClick = { assignedTo = who },
                        label = { Text(assignmentLabel(who)) },
                    )
                }
            }
        }
    }
}

private fun priorityLabel(p: String) = when (p) {
    "HIGH" -> "فوری"
    "LOW" -> "کم"
    else -> "معمولی"
}

private fun priorityColor(p: String) = when (p) {
    "HIGH" -> Danger
    "LOW" -> TextTertiary
    else -> Warning
}

private fun assignmentLabel(a: String) = when (a) {
    "ME" -> "من"
    "PARTNER" -> "پارتنر"
    else -> "هردو"
}
