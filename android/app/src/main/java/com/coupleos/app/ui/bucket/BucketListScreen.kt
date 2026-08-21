package com.coupleos.app.ui.bucket

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.BucketItemDao
import com.coupleos.app.data.local.entity.BucketItemEntity
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
class BucketListViewModel @Inject constructor(
    private val bucketItemDao: BucketItemDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val syncRepository: CoupleSyncRepository,
) : ViewModel() {

    val items: StateFlow<List<BucketItemEntity>> = bucketItemDao.getAllItems()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _feedback = MutableStateFlow<String?>(null)
    val feedback: StateFlow<String?> = _feedback

    fun add(title: String, description: String) {
        if (title.isBlank()) return
        viewModelScope.launch {
            val now = LocalDateTime.now().toString()
            bucketItemDao.insert(
                BucketItemEntity(
                    id = cryptoManager.generateId(),
                    title = title.trim(),
                    description = description.trim(),
                    createdBy = secureStorage.getUserId().orEmpty(),
                    createdAt = now,
                    updatedAt = now,
                    isSynced = false,
                )
            )
            push("به لیست اضافه شد")
        }
    }

    fun toggle(item: BucketItemEntity) {
        viewModelScope.launch {
            val done = !item.isCompleted
            bucketItemDao.update(
                item.copy(
                    isCompleted = done,
                    completedDate = if (done) LocalDate.now().toString() else "",
                    updatedAt = LocalDateTime.now().toString(),
                    isSynced = false,
                )
            )
            push(if (done) "تبریک! یکی دیگه تیک خورد 🎉" else null)
        }
    }

    fun remove(item: BucketItemEntity) {
        viewModelScope.launch {
            bucketItemDao.softDelete(item.id, LocalDateTime.now().toString())
            push("حذف شد")
        }
    }

    private suspend fun push(prefix: String?) {
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
fun BucketListScreen(onBack: () -> Unit, viewModel: BucketListViewModel = hiltViewModel()) {
    val items by viewModel.items.collectAsState()
    val feedback by viewModel.feedback.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showDialog by remember { mutableStateOf(false) }

    LaunchedEffect(feedback) {
        feedback?.let { snackbarHostState.showSnackbar(it); viewModel.clearFeedback() }
    }

    val done = items.count { it.isCompleted }

    FeatureScaffold(
        title = "لیست خواسته‌ها",
        subtitle = "$done از ${items.size} انجام شده",
        onBack = onBack,
        snackbarHostState = snackbarHostState,
        onFabClick = { showDialog = true },
        fabIcon = { Icon(Icons.Default.Add, contentDescription = "افزودن") },
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (items.isNotEmpty()) {
                val progress = if (items.isEmpty()) 0f else done.toFloat() / items.size
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 10.dp)
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(DividerColor),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(progress.coerceIn(0f, 1f))
                            .fillMaxHeight()
                            .clip(RoundedCornerShape(3.dp))
                            .background(Primary),
                    )
                }
            }
            if (items.isEmpty()) {
                EmptyState("🎯", "لیست خواسته‌ها خالیه", "کارهایی که می‌خواید با هم انجام بدید رو بنویسید")
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(items, key = { it.id }) { item ->
                        CoupleCard {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Checkbox(
                                    checked = item.isCompleted,
                                    onCheckedChange = { viewModel.toggle(item) },
                                    colors = CheckboxDefaults.colors(checkedColor = Primary, uncheckedColor = TextTertiary),
                                )
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(item.title, style = MaterialTheme.typography.titleSmall, color = TextPrimary)
                                    if (item.description.isNotBlank()) {
                                        Text(item.description, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                                    }
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        if (item.completedDate.isNotBlank()) {
                                            Text("✔ ${item.completedDate}", style = MaterialTheme.typography.labelSmall, color = Success)
                                        }
                                        SyncBadge(item.isSynced)
                                    }
                                }
                                TextButton(onClick = { viewModel.remove(item) }) {
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
        var description by remember { mutableStateOf("") }
        CoupleDialog(
            title = "خواسته جدید",
            onDismiss = { showDialog = false },
            onConfirm = { viewModel.add(title, description); showDialog = false },
            confirmEnabled = title.isNotBlank(),
        ) {
            CoupleTextField(title, { title = it }, "چیکار می‌خوایم بکنیم؟", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(description, { description = it }, "جزئیات", minLines = 2)
        }
    }
}
