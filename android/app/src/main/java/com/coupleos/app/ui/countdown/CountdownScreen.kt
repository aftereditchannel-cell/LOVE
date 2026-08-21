package com.coupleos.app.ui.countdown

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.CountdownDao
import com.coupleos.app.data.local.entity.CountdownEntity
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
import java.time.temporal.ChronoUnit
import javax.inject.Inject

@HiltViewModel
class CountdownViewModel @Inject constructor(
    private val countdownDao: CountdownDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val syncRepository: CoupleSyncRepository,
) : ViewModel() {

    val items: StateFlow<List<CountdownEntity>> = countdownDao.getAllCountdowns()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _feedback = MutableStateFlow<String?>(null)
    val feedback: StateFlow<String?> = _feedback

    fun add(title: String, targetDate: String, emoji: String) {
        if (title.isBlank()) return
        val parsed = runCatching { LocalDate.parse(targetDate.trim()) }.getOrNull()
        if (parsed == null) {
            _feedback.value = "تاریخ باید به شکل YYYY-MM-DD باشه"
            return
        }
        viewModelScope.launch {
            countdownDao.insert(
                CountdownEntity(
                    id = cryptoManager.generateId(),
                    title = title.trim(),
                    targetDate = parsed.toString(),
                    emoji = emoji.ifBlank { "❤️" },
                    createdBy = secureStorage.getUserId().orEmpty(),
                    createdAt = LocalDateTime.now().toString(),
                    isSynced = false,
                )
            )
            val result = syncRepository.push()
            _feedback.value = if (result.ok) "شمارش معکوس ساخته شد و روی توکن ذخیره شد ✅"
            else "ساخته شد (لوکال) — ${result.message}"
        }
    }

    fun remove(item: CountdownEntity) {
        viewModelScope.launch {
            countdownDao.delete(item.id)
            val result = syncRepository.push()
            _feedback.value = if (result.ok) "حذف شد" else result.message
        }
    }

    fun clearFeedback() { _feedback.value = null }
}

@Composable
fun CountdownScreen(onBack: () -> Unit, viewModel: CountdownViewModel = hiltViewModel()) {
    val items by viewModel.items.collectAsState()
    val feedback by viewModel.feedback.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showDialog by remember { mutableStateOf(false) }
    val today = remember { LocalDate.now() }

    LaunchedEffect(feedback) {
        feedback?.let { snackbarHostState.showSnackbar(it); viewModel.clearFeedback() }
    }

    FeatureScaffold(
        title = "شمارش معکوس",
        subtitle = "${items.size} رویداد",
        onBack = onBack,
        snackbarHostState = snackbarHostState,
        onFabClick = { showDialog = true },
        fabIcon = { Icon(Icons.Default.Add, contentDescription = "افزودن") },
    ) { padding ->
        if (items.isEmpty()) {
            Box(modifier = Modifier.padding(padding)) {
                EmptyState("⏱️", "هنوز شمارش معکوسی نداری", "سالگرد، سفر یا هر روز خاصی رو اضافه کن")
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(items, key = { it.id }) { item ->
                    val days = runCatching {
                        ChronoUnit.DAYS.between(today, LocalDate.parse(item.targetDate))
                    }.getOrDefault(0L)
                    CoupleCard {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(item.emoji, fontSize = 34.sp)
                            Spacer(modifier = Modifier.width(14.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.title, style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                                Text(item.targetDate, style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                                SyncBadge(item.isSynced)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = when {
                                        days > 0 -> "$days"
                                        days == 0L -> "امروز"
                                        else -> "${-days}"
                                    },
                                    style = MaterialTheme.typography.headlineSmall,
                                    color = Primary,
                                    textAlign = TextAlign.Center,
                                )
                                Text(
                                    text = when {
                                        days > 0 -> "روز مونده"
                                        days == 0L -> "🎉"
                                        else -> "روز گذشته"
                                    },
                                    style = MaterialTheme.typography.labelSmall,
                                    color = TextTertiary,
                                )
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

    if (showDialog) {
        var title by remember { mutableStateOf("") }
        var date by remember { mutableStateOf(LocalDate.now().plusDays(30).toString()) }
        var emoji by remember { mutableStateOf("❤️") }

        CoupleDialog(
            title = "شمارش معکوس جدید",
            onDismiss = { showDialog = false },
            onConfirm = { viewModel.add(title, date, emoji); showDialog = false },
            confirmEnabled = title.isNotBlank(),
        ) {
            CoupleTextField(title, { title = it }, "عنوان", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(date, { date = it }, "تاریخ (YYYY-MM-DD)", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            Text("ایموجی", color = TextSecondary, style = MaterialTheme.typography.labelMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("❤️", "🎂", "✈️", "🎉", "💍", "🏖️").forEach { e ->
                    FilterChip(selected = emoji == e, onClick = { emoji = e }, label = { Text(e) })
                }
            }
        }
    }
}
