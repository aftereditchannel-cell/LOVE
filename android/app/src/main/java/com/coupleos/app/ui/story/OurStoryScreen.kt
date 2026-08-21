package com.coupleos.app.ui.story

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import com.coupleos.app.data.local.dao.TimelineDao
import com.coupleos.app.data.local.entity.TimelineEventEntity
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
class OurStoryViewModel @Inject constructor(
    private val timelineDao: TimelineDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val syncRepository: CoupleSyncRepository,
) : ViewModel() {

    val events: StateFlow<List<TimelineEventEntity>> = timelineDao.getAllEvents()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _feedback = MutableStateFlow<String?>(null)
    val feedback: StateFlow<String?> = _feedback

    fun add(title: String, date: String, description: String, type: String) {
        if (title.isBlank()) return
        val parsed = runCatching { LocalDate.parse(date.trim()) }.getOrNull()
        if (parsed == null) {
            _feedback.value = "تاریخ باید YYYY-MM-DD باشه"
            return
        }
        viewModelScope.launch {
            timelineDao.insert(
                TimelineEventEntity(
                    id = cryptoManager.generateId(),
                    title = title.trim(),
                    date = parsed.toString(),
                    description = description.trim(),
                    type = type,
                    createdAt = LocalDateTime.now().toString(),
                    isSynced = false,
                )
            )
            val result = syncRepository.push()
            _feedback.value = if (result.ok) "به داستان ما اضافه شد ✅" else "اضافه شد (لوکال) — ${result.message}"
        }
    }

    fun remove(event: TimelineEventEntity) {
        viewModelScope.launch {
            timelineDao.delete(event.id)
            syncRepository.push()
            _feedback.value = "حذف شد"
        }
    }

    fun clearFeedback() { _feedback.value = null }
}

@Composable
fun OurStoryScreen(onBack: () -> Unit, viewModel: OurStoryViewModel = hiltViewModel()) {
    val events by viewModel.events.collectAsState()
    val feedback by viewModel.feedback.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showDialog by remember { mutableStateOf(false) }

    LaunchedEffect(feedback) {
        feedback?.let { snackbarHostState.showSnackbar(it); viewModel.clearFeedback() }
    }

    val firstDate = events.minByOrNull { it.date }?.date
    val daysTogether = firstDate?.let {
        runCatching { ChronoUnit.DAYS.between(LocalDate.parse(it), LocalDate.now()) }.getOrNull()
    }

    FeatureScaffold(
        title = "داستان ما",
        subtitle = daysTogether?.let { "$it روز از اولین لحظه" } ?: "${events.size} لحظه",
        onBack = onBack,
        snackbarHostState = snackbarHostState,
        onFabClick = { showDialog = true },
        fabIcon = { Icon(Icons.Default.Add, contentDescription = "افزودن") },
    ) { padding ->
        if (events.isEmpty()) {
            Box(modifier = Modifier.padding(padding)) {
                EmptyState("📖", "داستان‌تون هنوز شروع نشده", "اولین روزی که همدیگه رو دیدید رو ثبت کنید")
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
            ) {
                items(events, key = { it.id }) { event ->
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.width(28.dp),
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(12.dp)
                                    .clip(CircleShape)
                                    .background(Primary)
                            )
                            Box(
                                modifier = Modifier
                                    .width(2.dp)
                                    .height(72.dp)
                                    .background(DividerColor)
                            )
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f).padding(bottom = 12.dp)) {
                            Text(event.date, style = MaterialTheme.typography.labelSmall, color = Primary)
                            Text(event.title, style = MaterialTheme.typography.titleSmall, color = TextPrimary)
                            if (event.description.isNotBlank()) {
                                Text(event.description, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                            }
                            SyncBadge(event.isSynced)
                        }
                        TextButton(onClick = { viewModel.remove(event) }) {
                            Text("حذف", color = Danger, style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }

    if (showDialog) {
        var title by remember { mutableStateOf("") }
        var date by remember { mutableStateOf(LocalDate.now().toString()) }
        var description by remember { mutableStateOf("") }
        var type by remember { mutableStateOf("MOMENT") }

        CoupleDialog(
            title = "یک لحظه از داستان ما",
            onDismiss = { showDialog = false },
            onConfirm = { viewModel.add(title, date, description, type); showDialog = false },
            confirmEnabled = title.isNotBlank(),
        ) {
            CoupleTextField(title, { title = it }, "چه اتفاقی افتاد؟", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(date, { date = it }, "تاریخ (YYYY-MM-DD)", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(description, { description = it }, "توضیح", minLines = 3)
            Spacer(modifier = Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("MOMENT" to "لحظه", "FIRST" to "اولین بار", "TRIP" to "سفر", "MILESTONE" to "نقطه عطف").forEach { (key, label) ->
                    FilterChip(selected = type == key, onClick = { type = key }, label = { Text(label) })
                }
            }
        }
    }
}
