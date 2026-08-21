package com.coupleos.app.ui.questions

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.DailyQuestionDao
import com.coupleos.app.data.local.entity.DailyQuestionEntity
import com.coupleos.app.data.local.entity.QuestionAnswerEntity
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

/** A new question every day; both partners answer and then see each other's reply. */
@HiltViewModel
class QuestionsViewModel @Inject constructor(
    private val dailyQuestionDao: DailyQuestionDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val syncRepository: CoupleSyncRepository,
) : ViewModel() {

    companion object {
        val QUESTION_BANK = listOf(
            "امروز بیشتر از همه دلت چی می‌خواد؟",
            "کدوم خاطره‌مون رو هیچ‌وقت فراموش نمی‌کنی؟",
            "اگر همین الان سفر می‌رفتیم، کجا می‌رفتیم؟",
            "امروز از چه چیزی ممنونی؟",
            "یک چیز که امروز لبخند رو لبت آورد؟",
            "چه آهنگی الان حالت رو خوب می‌کنه؟",
            "اگر فردا تعطیل بود چیکار می‌کردی؟",
            "چه چیزی در من باعث میشه احساس امنیت کنی؟",
            "اولین چیزی که از من توی ذهنت موند چی بود؟",
            "پنج سال دیگه ما رو کجا می‌بینی؟",
            "چه عادتی از من رو دوست داری؟",
            "امروز چه کاری برات سخت بود؟",
            "دوست داری آخر هفته چیکار کنیم؟",
            "چه جمله‌ای از من بیشتر از همه حالت رو خوب می‌کنه؟",
            "اگه می‌تونستی یک روز از گذشته‌مون رو تکرار کنی، کدوم روز؟",
        )
    }

    private val today: String = LocalDate.now().toString()

    private val _question = MutableStateFlow<DailyQuestionEntity?>(null)
    val question: StateFlow<DailyQuestionEntity?> = _question

    private val _answerText = MutableStateFlow("")
    val answerText: StateFlow<String> = _answerText

    private val _feedback = MutableStateFlow<String?>(null)
    val feedback: StateFlow<String?> = _feedback

    val allAnswers: StateFlow<List<QuestionAnswerEntity>> = dailyQuestionDao.observeAllAnswers()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val history: StateFlow<List<DailyQuestionEntity>> = dailyQuestionDao.observeAllQuestions()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val myUserId: String get() = secureStorage.getUserId().orEmpty()
    val myName: String get() = secureStorage.getCurrentUserName()
    val partnerName: String get() = secureStorage.getPartnerName()

    init { ensureTodayQuestion() }

    private fun ensureTodayQuestion() {
        viewModelScope.launch {
            val existing = dailyQuestionDao.getQuestionByDate(today)
            if (existing != null) {
                _question.value = existing
            } else {
                val index = LocalDate.now().dayOfYear % QUESTION_BANK.size
                val entity = DailyQuestionEntity(
                    id = "q-$today",
                    question = QUESTION_BANK[index],
                    date = today,
                )
                dailyQuestionDao.insert(entity)
                _question.value = entity
            }
            val mine = dailyQuestionDao.getAnswers(_question.value!!.id).first()
                .firstOrNull { it.userId == myUserId }
            if (mine != null) _answerText.value = mine.answer
        }
    }

    fun updateAnswer(text: String) { _answerText.value = text }

    fun saveAnswer() {
        val q = _question.value ?: return
        val text = _answerText.value.trim()
        if (text.isBlank()) return
        viewModelScope.launch {
            dailyQuestionDao.insertAnswer(
                QuestionAnswerEntity(
                    id = "${q.id}-$myUserId",
                    questionId = q.id,
                    userId = myUserId,
                    answer = text,
                    createdAt = LocalDateTime.now().toString(),
                    isSynced = false,
                )
            )
            val result = syncRepository.push()
            _feedback.value = if (result.ok) "جوابت ثبت و روی توکن ذخیره شد ✅"
            else "ثبت شد (لوکال) — ${result.message}"
        }
    }

    fun clearFeedback() { _feedback.value = null }
}

@Composable
fun QuestionsScreen(onBack: () -> Unit, viewModel: QuestionsViewModel = hiltViewModel()) {
    val question by viewModel.question.collectAsState()
    val answerText by viewModel.answerText.collectAsState()
    val answers by viewModel.allAnswers.collectAsState()
    val history by viewModel.history.collectAsState()
    val feedback by viewModel.feedback.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(feedback) {
        feedback?.let { snackbarHostState.showSnackbar(it); viewModel.clearFeedback() }
    }

    val todayAnswers = answers.filter { it.questionId == question?.id }
    val partnerAnswer = todayAnswers.firstOrNull { it.userId != viewModel.myUserId }

    FeatureScaffold(
        title = "سؤال روزانه",
        subtitle = question?.date,
        onBack = onBack,
        snackbarHostState = snackbarHostState,
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
        ) {
            CoupleCard {
                Text("❓", style = MaterialTheme.typography.headlineSmall)
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = question?.question ?: "در حال آماده‌سازی…",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary,
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
            CoupleTextField(answerText, { viewModel.updateAnswer(it) }, "جواب تو", minLines = 3)
            Spacer(modifier = Modifier.height(10.dp))
            Button(
                onClick = { viewModel.saveAnswer() },
                enabled = answerText.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = Primary, contentColor = OnPrimary),
                modifier = Modifier.fillMaxWidth(),
            ) { Text("ثبت جواب") }

            Spacer(modifier = Modifier.height(20.dp))
            Text("جواب ${viewModel.partnerName.ifBlank { "پارتنر" }}", style = MaterialTheme.typography.labelMedium, color = TextTertiary)
            Spacer(modifier = Modifier.height(6.dp))
            CoupleCard {
                Text(
                    text = partnerAnswer?.answer ?: "هنوز جواب نداده — بعد از همگام‌سازی اینجا نمایش داده میشه",
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (partnerAnswer != null) TextPrimary else TextTertiary,
                )
            }

            if (history.size > 1) {
                Spacer(modifier = Modifier.height(20.dp))
                Text("سؤال‌های قبلی", style = MaterialTheme.typography.labelMedium, color = TextTertiary)
                Spacer(modifier = Modifier.height(6.dp))
                history.filter { it.id != question?.id }.take(10).forEach { q ->
                    CoupleCard {
                        Text(q.date, style = MaterialTheme.typography.labelSmall, color = Primary)
                        Text(q.question, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                        answers.filter { it.questionId == q.id }.forEach { a ->
                            Text(
                                text = (if (a.userId == viewModel.myUserId) "${viewModel.myName}: " else "${viewModel.partnerName}: ") + a.answer,
                                style = MaterialTheme.typography.bodySmall,
                                color = TextTertiary,
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }

            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}
