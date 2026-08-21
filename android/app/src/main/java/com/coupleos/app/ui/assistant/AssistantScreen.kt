package com.coupleos.app.ui.assistant

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.*
import com.coupleos.app.security.keystore.SecureStorage
import com.coupleos.app.ui.common.*
import com.coupleos.app.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import javax.inject.Inject

data class AssistantMessage(val fromUser: Boolean, val text: String)

/**
 * Fully offline assistant. It never calls an external AI service — it reasons
 * over the couple's own local data, so it works without internet and keeps
 * everything private.
 */
@HiltViewModel
class AssistantViewModel @Inject constructor(
    private val moodDao: MoodDao,
    private val memoryDao: MemoryDao,
    private val taskDao: TaskDao,
    private val calendarDao: CalendarDao,
    private val messageDao: MessageDao,
    private val countdownDao: CountdownDao,
    private val bucketItemDao: BucketItemDao,
    private val checkinDao: RelationshipCheckinDao,
    private val secureStorage: SecureStorage,
) : ViewModel() {

    private val _messages = MutableStateFlow<List<AssistantMessage>>(emptyList())
    val messages: StateFlow<List<AssistantMessage>> = _messages

    private val _input = MutableStateFlow("")
    val input: StateFlow<String> = _input

    val suggestions = listOf(
        "خلاصه رابطه‌مون",
        "چه کارهایی مونده؟",
        "حال پارتنرم چطوره؟",
        "یه ایده برای امشب",
        "آمار خاطرات",
    )

    init {
        _messages.value = listOf(
            AssistantMessage(
                false,
                "سلام ❤️ من دستیار دنیای کوچیک شمام. هرچی درباره داده‌های خودمون بپرسی جواب می‌دم — " +
                    "همه‌چی آفلاین و خصوصی محاسبه میشه."
            )
        )
    }

    fun updateInput(text: String) { _input.value = text }

    fun send(text: String = _input.value) {
        val question = text.trim()
        if (question.isBlank()) return
        _input.value = ""
        _messages.value = _messages.value + AssistantMessage(true, question)
        viewModelScope.launch {
            val answer = answer(question)
            _messages.value = _messages.value + AssistantMessage(false, answer)
        }
    }

    private suspend fun answer(question: String): String {
        val q = question.lowercase()
        return when {
            q.contains("خلاصه") || q.contains("رابطه") -> relationshipSummary()
            q.contains("کار") || q.contains("تسک") -> tasksSummary()
            q.contains("حال") || q.contains("مود") -> moodSummary()
            q.contains("ایده") || q.contains("قرار") || q.contains("امشب") -> ideaSuggestion()
            q.contains("خاطره") || q.contains("آمار") -> statsSummary()
            q.contains("شمارش") || q.contains("چند روز") -> countdownSummary()
            q.contains("سلام") -> "سلام ${secureStorage.getCurrentUserName()} ❤️ چطور می‌تونم کمک کنم؟"
            else -> "می‌تونم درباره‌ی این‌ها کمکت کنم:\n• خلاصه رابطه\n• کارهای باقی‌مانده\n• حال و مود\n• ایده قرار\n• آمار خاطرات\n• شمارش معکوس‌ها"
        }
    }

    private suspend fun relationshipSummary(): String {
        val checkins = checkinDao.getAllOnce()
        val memories = memoryDao.getAllOnce().count { it.deletedAt == null }
        val messages = messageDao.getAllOnce().count { !it.isDeleted }
        val bucket = bucketItemDao.getAllOnce()
        val done = bucket.count { it.isCompleted }

        val avg = if (checkins.isEmpty()) null else checkins
            .map { (it.communication + it.trust + it.qualityTime + it.affection + it.funScore + it.support) / 6.0 }
            .average()

        val builder = StringBuilder("خلاصه دنیای کوچیک ما:\n")
        builder.append("• $memories خاطره ثبت شده\n")
        builder.append("• $messages پیام رد و بدل شده\n")
        builder.append("• $done از ${bucket.size} خواسته انجام شده\n")
        if (avg != null) builder.append("• میانگین امتیاز رابطه: ${"%.1f".format(avg)} از ۱۰\n")
        builder.append(
            when {
                avg == null -> "\nهنوز چک‌این رابطه ثبت نکردید — از بخش «رابطه ما» شروع کنید."
                avg >= 8 -> "\nحال رابطه‌تون عالیه، همینطور ادامه بدید ❤️"
                avg >= 6 -> "\nخوبه، ولی وقت باکیفیت بیشتری بذارید."
                else -> "\nبه نظر می‌رسه این روزها سخت گذشته — یک گفتگوی صادقانه می‌تونه کمک کنه."
            }
        )
        return builder.toString()
    }

    private suspend fun tasksSummary(): String {
        val tasks = taskDao.getAllOnce().filter { it.deletedAt == null }
        val open = tasks.filter { it.status != "DONE" }
        if (open.isEmpty()) return "هیچ کار بازی نداری 🎉 همه‌چی انجام شده."
        val urgent = open.filter { it.priority == "HIGH" }
        val builder = StringBuilder("${open.size} کار باز داری:\n")
        open.take(8).forEach { builder.append("• ${it.title}${if (it.dueDate.isNotBlank()) " (${it.dueDate})" else ""}\n") }
        if (urgent.isNotEmpty()) builder.append("\n${urgent.size} تاش فوریه — اول اون‌ها رو بزن.")
        return builder.toString()
    }

    private suspend fun moodSummary(): String {
        val today = LocalDate.now().toString()
        val myId = secureStorage.getUserId().orEmpty()
        val moods = moodDao.getAllOnce()
        val mine = moods.filter { it.userId == myId }.maxByOrNull { it.date }
        val partner = moods.filter { it.userId != myId }.maxByOrNull { it.date }

        val builder = StringBuilder()
        builder.append(
            if (mine == null) "تو هنوز حالت رو ثبت نکردی.\n"
            else "حال تو (${mine.date}): ${mine.mood} — انرژی ${mine.energy}/۱۰، استرس ${mine.stress}/۱۰\n"
        )
        builder.append(
            if (partner == null) "از پارتنرت هنوز چیزی دریافت نشده — یک همگام‌سازی بزن.\n"
            else "حال ${secureStorage.getPartnerName()} (${partner.date}): ${partner.mood} — انرژی ${partner.energy}/۱۰\n"
        )
        if (partner != null && partner.date == today && partner.mood in listOf("ناراحت", "خیلی بد", "عصبانی")) {
            builder.append("\nامروز حالش خوب نیست — شاید یک پیام کوچیک حالش رو بهتر کنه ❤️")
        }
        return builder.toString()
    }

    private suspend fun ideaSuggestion(): String {
        val events = calendarDao.getAllOnce().filter { it.deletedAt == null }
        val ideas = listOf(
            "شب فیلم با یک فیلم قدیمی که هردو دوست دارید 🎬",
            "با هم یک غذای جدید بپزید 🍳",
            "پیاده‌روی شبانه بدون گوشی 🚶",
            "هرکدوم یک نامه برای سال بعد بنویسید 💌",
            "یک پلی‌لیست مشترک بسازید 🎵",
        )
        val pick = ideas[(LocalDate.now().dayOfYear + events.size) % ideas.size]
        return "پیشنهاد امشب:\n$pick\n\nاگه خوشت اومد از بخش «برنامه قرار» بذارش توی تقویم."
    }

    private suspend fun statsSummary(): String {
        val memories = memoryDao.getAllOnce().filter { it.deletedAt == null }
        if (memories.isEmpty()) return "هنوز خاطره‌ای ثبت نکردید. اولین خاطره‌تون رو بسازید 📸"
        val favorites = memories.count { it.isFavorite }
        val first = memories.minByOrNull { it.date }
        val days = first?.let {
            runCatching { ChronoUnit.DAYS.between(LocalDate.parse(it.date), LocalDate.now()) }.getOrNull()
        }
        return buildString {
            append("${memories.size} خاطره ثبت کردید\n")
            append("$favorites تاش مورد علاقه‌ست\n")
            if (first != null) append("اولین خاطره: «${first.title}» در ${first.date}\n")
            if (days != null) append("یعنی $days روز از اولین خاطره‌تون گذشته ❤️")
        }
    }

    private suspend fun countdownSummary(): String {
        val today = LocalDate.now()
        val items = countdownDao.getAllOnce()
        if (items.isEmpty()) return "هیچ شمارش معکوسی نداری. از بخش «شمارش معکوس» اضافه کن ⏱️"
        return buildString {
            append("شمارش معکوس‌های تو:\n")
            items.sortedBy { it.targetDate }.take(6).forEach {
                val d = runCatching { ChronoUnit.DAYS.between(today, LocalDate.parse(it.targetDate)) }.getOrDefault(0L)
                append("• ${it.emoji} ${it.title}: ${if (d >= 0) "$d روز مونده" else "${-d} روز گذشته"}\n")
            }
        }
    }
}

@Composable
fun AssistantScreen(onBack: () -> Unit, viewModel: AssistantViewModel = hiltViewModel()) {
    val messages by viewModel.messages.collectAsState()
    val input by viewModel.input.collectAsState()

    FeatureScaffold(
        title = "دستیار هوشمند",
        subtitle = "آفلاین و خصوصی",
        onBack = onBack,
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(messages) { message ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = if (message.fromUser) Arrangement.End else Arrangement.Start,
                    ) {
                        Box(
                            modifier = Modifier
                                .widthIn(max = 300.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(if (message.fromUser) PrimaryContainer else SurfaceElevated)
                                .padding(12.dp),
                        ) {
                            Text(
                                text = message.text,
                                color = TextPrimary,
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }
                    }
                }
                item { Spacer(modifier = Modifier.height(8.dp)) }
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                viewModel.suggestions.take(3).forEach { s ->
                    AssistChip(onClick = { viewModel.send(s) }, label = { Text(s, style = MaterialTheme.typography.labelSmall) })
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CoupleTextField(
                    value = input,
                    onValueChange = { viewModel.updateInput(it) },
                    label = "سؤالت رو بپرس…",
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(onClick = { viewModel.send() }, enabled = input.isNotBlank()) {
                    Icon(
                        Icons.AutoMirrored.Filled.Send,
                        contentDescription = "ارسال",
                        tint = if (input.isNotBlank()) Primary else TextTertiary,
                    )
                }
            }
        }
    }
}
