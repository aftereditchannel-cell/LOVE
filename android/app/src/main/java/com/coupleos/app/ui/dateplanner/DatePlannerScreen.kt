package com.coupleos.app.ui.dateplanner

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.CalendarDao
import com.coupleos.app.data.local.entity.CalendarEventEntity
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

data class DateIdea(
    val emoji: String,
    val title: String,
    val description: String,
    val category: String,
    val cost: String,
)

@HiltViewModel
class DatePlannerViewModel @Inject constructor(
    private val calendarDao: CalendarDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val syncRepository: CoupleSyncRepository,
) : ViewModel() {

    companion object {
        val IDEAS = listOf(
            DateIdea("🏠", "شب فیلم خانگی", "یک فیلم قدیمی که هردو دوست دارید + پاپ‌کورن", "خانه", "رایگان"),
            DateIdea("🍳", "با هم آشپزی کنیم", "یک غذای جدید که تا حالا نپختید", "خانه", "کم"),
            DateIdea("🌅", "طلوع آفتاب", "صبح زود بیدار شید و طلوع رو ببینید", "بیرون", "رایگان"),
            DateIdea("🚶", "پیاده‌روی بی‌هدف", "بدون نقشه توی شهر قدم بزنید", "بیرون", "رایگان"),
            DateIdea("☕", "کافه‌گردی", "یک کافه جدید رو امتحان کنید", "بیرون", "متوسط"),
            DateIdea("📸", "عکاسی دوتایی", "یک آلبوم عکس از یک روزتون بسازید", "بیرون", "رایگان"),
            DateIdea("🎨", "کلاس هنری", "با هم نقاشی یا سفالگری کنید", "بیرون", "متوسط"),
            DateIdea("🌌", "ستاره‌بینی", "بیرون شهر برید و آسمون رو نگاه کنید", "بیرون", "کم"),
            DateIdea("📚", "کتاب‌فروشی", "هرکدوم برای اون‌یکی یه کتاب انتخاب کنید", "بیرون", "متوسط"),
            DateIdea("🧺", "پیک‌نیک پارک", "یه سبد ساده و یه پتو", "بیرون", "کم"),
            DateIdea("🎮", "شب بازی", "بازی رومیزی یا ویدیویی دونفره", "خانه", "رایگان"),
            DateIdea("💌", "نامه‌نویسی", "هرکدوم یک نامه برای آینده بنویسید", "خانه", "رایگان"),
            DateIdea("🚗", "سفر یک‌روزه", "نزدیک‌ترین شهر یا روستا", "سفر", "زیاد"),
            DateIdea("🍜", "غذای ناشناخته", "یک آشپزی از کشور دیگه رو امتحان کنید", "بیرون", "متوسط"),
            DateIdea("🎵", "پلی‌لیست مشترک", "هرکدوم ۱۰ آهنگ اضافه کنید و گوش بدید", "خانه", "رایگان"),
        )
    }

    private val _category = MutableStateFlow("همه")
    val category: StateFlow<String> = _category

    private val _feedback = MutableStateFlow<String?>(null)
    val feedback: StateFlow<String?> = _feedback

    val plannedDates: StateFlow<List<CalendarEventEntity>> = calendarDao.getAllEvents()
        .map { list -> list.filter { it.type == "DATE" } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun setCategory(value: String) { _category.value = value }

    fun ideas(): List<DateIdea> =
        if (_category.value == "همه") IDEAS else IDEAS.filter { it.category == _category.value }

    fun schedule(idea: DateIdea, date: String) {
        val parsed = runCatching { LocalDate.parse(date.trim()) }.getOrNull()
        if (parsed == null) {
            _feedback.value = "تاریخ باید YYYY-MM-DD باشه"
            return
        }
        viewModelScope.launch {
            val now = LocalDateTime.now().toString()
            calendarDao.insert(
                CalendarEventEntity(
                    id = cryptoManager.generateId(),
                    title = "${idea.emoji} ${idea.title}",
                    description = idea.description,
                    date = parsed.toString(),
                    type = "DATE",
                    createdBy = secureStorage.getUserId().orEmpty(),
                    createdAt = now,
                    updatedAt = now,
                    isSynced = false,
                )
            )
            val result = syncRepository.push()
            _feedback.value = if (result.ok) "قرار توی تقویم ثبت و روی توکن ذخیره شد ✅"
            else "ثبت شد (لوکال) — ${result.message}"
        }
    }

    fun clearFeedback() { _feedback.value = null }
}

@Composable
fun DatePlannerScreen(onBack: () -> Unit, viewModel: DatePlannerViewModel = hiltViewModel()) {
    val category by viewModel.category.collectAsState()
    val planned by viewModel.plannedDates.collectAsState()
    val feedback by viewModel.feedback.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var scheduling by remember { mutableStateOf<DateIdea?>(null) }

    LaunchedEffect(feedback) {
        feedback?.let { snackbarHostState.showSnackbar(it); viewModel.clearFeedback() }
    }

    val ideas = viewModel.ideas()

    FeatureScaffold(
        title = "برنامه قرار",
        subtitle = "${planned.size} قرار برنامه‌ریزی‌شده",
        onBack = onBack,
        snackbarHostState = snackbarHostState,
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            Row(
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                listOf("همه", "خانه", "بیرون", "سفر").forEach { c ->
                    FilterChip(selected = category == c, onClick = { viewModel.setCategory(c) }, label = { Text(c) })
                }
            }

            LazyColumn(
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                if (planned.isNotEmpty()) {
                    item {
                        Text("قرارهای پیش رو", style = MaterialTheme.typography.labelMedium, color = TextTertiary)
                    }
                    items(planned, key = { it.id }) { event ->
                        CoupleCard {
                            Text(event.title, style = MaterialTheme.typography.titleSmall, color = TextPrimary)
                            Text(event.date, style = MaterialTheme.typography.labelSmall, color = Primary)
                            SyncBadge(event.isSynced)
                        }
                    }
                    item { Spacer(modifier = Modifier.height(8.dp)) }
                }

                item {
                    Text("ایده‌های قرار", style = MaterialTheme.typography.labelMedium, color = TextTertiary)
                }
                items(ideas) { idea ->
                    CoupleCard(onClick = { scheduling = idea }) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(idea.emoji, style = MaterialTheme.typography.headlineSmall)
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(idea.title, style = MaterialTheme.typography.titleSmall, color = TextPrimary)
                                Text(idea.description, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                                Text("${idea.category} • هزینه: ${idea.cost}", style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                            }
                            Text("برنامه‌ریزی", color = Primary, style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }

    scheduling?.let { idea ->
        var date by remember { mutableStateOf(LocalDate.now().plusDays(7).toString()) }
        CoupleDialog(
            title = "${idea.emoji} ${idea.title}",
            confirmText = "بذار توی تقویم",
            onDismiss = { scheduling = null },
            onConfirm = { viewModel.schedule(idea, date); scheduling = null },
        ) {
            Text(idea.description, color = TextSecondary, style = MaterialTheme.typography.bodyMedium)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(date, { date = it }, "تاریخ (YYYY-MM-DD)", singleLine = true)
        }
    }
}
