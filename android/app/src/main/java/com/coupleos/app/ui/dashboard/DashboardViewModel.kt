package com.coupleos.app.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.*
import com.coupleos.app.data.repository.GitHubRepository
import com.coupleos.app.security.keystore.SecureStorage
import com.coupleos.app.sync.SyncManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale
import javax.inject.Inject

data class DashboardUiState(
    val userName: String = "",
    val dateString: String = "",
    val todayMood: String? = null,
    val todayMoodEmoji: String = "",
    val partnerMood: String? = null,
    val partnerMoodEmoji: String = "",
    val partnerNeedsAttention: Boolean = false,
    val daysTogether: Long = 0,
    val nextCountdown: Pair<String, Long>? = null,
    val dailyQuestion: String? = null,
    val activeTaskCount: Int = 0,
    val insights: List<String> = emptyList(),
    // Connection
    val myConnected: Boolean? = null,
    val partnerConnected: Boolean? = null,
    val myGitHubUsername: String? = null,
    val partnerGitHubUsername: String? = null,
    val isCheckingConnection: Boolean = false,
    // Refresh
    val isRefreshing: Boolean = false,
    // Feedback
    val feedbackMessage: String? = null,
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val secureStorage: SecureStorage,
    private val moodDao: MoodDao,
    private val taskDao: TaskDao,
    private val memoryDao: MemoryDao,
    private val countdownDao: CountdownDao,
    private val gitHubRepository: GitHubRepository,
    private val syncManager: SyncManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState

    private val moodEmojis = mapOf(
        "عالی" to "😍", "عاشق" to "🥰", "خوب" to "😊", "معمولی" to "🙂",
        "خنثی" to "😐", "ناراحت" to "😔", "خیلی بد" to "😢", "عصبانی" to "😡", "خسته" to "😴",
    )
    private val sadMoods = setOf("ناراحت", "خیلی بد", "عصبانی")

    private val defaultQuestions = listOf(
        "امروز بیشتر از همه دلت چی می‌خواد؟",
        "کدوم خاطرمون رو هیچ‌وقت فراموش نمی‌کنی؟",
        "اگر همین الان سفر می‌رفتیم کجا می‌رفتیم؟",
        "امروز از چه چیزی ممنونی؟",
        "یک چیز که امروز لبخند رو لبت آورد؟",
        "چه آهنگی الان حالت رو خوب می‌کنه؟",
        "اگر فردا تعطیل بود چیکار می‌کردی؟",
    )

    init {
        loadDashboard()
        checkConnection()
        syncFromToken()
    }

    /**
     * Pull all data from both tokens' gists into local storage,
     * so the partner's data shows up automatically without visiting each screen.
     */
    private fun syncFromToken() {
        viewModelScope.launch {
            try {
                val result = syncManager.pullAll()
                loadDashboard()
                if (result.error != null) {
                    _uiState.update { it.copy(feedbackMessage = "همگام‌سازی ناقص بود: ${result.error}") }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(feedbackMessage = "خطا در همگام‌سازی: ${e.localizedMessage}") }
            }
        }
    }

    private fun loadDashboard() {
        val today = LocalDate.now()
        val isoDate = today.toString()

        _uiState.update {
            it.copy(
                userName = secureStorage.getCurrentUserName(),
                dateString = try {
                    today.format(DateTimeFormatter.ofPattern("EEEE، d MMMM", Locale("fa")))
                } catch (e: Exception) { isoDate },
                dailyQuestion = defaultQuestions[today.dayOfYear % defaultQuestions.size],
                myGitHubUsername = secureStorage.getMyGitHubUsername(),
                partnerGitHubUsername = secureStorage.getPartnerGitHubUsername(),
            )
        }

        // Load today's mood
        viewModelScope.launch {
            val userId = secureStorage.getUserId() ?: return@launch
            val todayMood = moodDao.getMoodByDate(userId, isoDate)
            _uiState.update {
                it.copy(
                    todayMood = todayMood?.mood,
                    todayMoodEmoji = moodEmojis[todayMood?.mood] ?: "🤔",
                )
            }
        }

        // Load partner mood
        viewModelScope.launch {
            val allMoods = moodDao.getAllMoodsByDate(LocalDate.now().toString())
            val userId = secureStorage.getUserId()
            val partnerMoodEntry = allMoods.firstOrNull { it.userId != userId }
            _uiState.update {
                it.copy(
                    partnerMood = partnerMoodEntry?.mood,
                    partnerMoodEmoji = moodEmojis[partnerMoodEntry?.mood] ?: "💭",
                    partnerNeedsAttention = partnerMoodEntry?.mood in sadMoods,
                )
            }
        }

        // Load task count
        viewModelScope.launch {
            taskDao.getActiveTaskCount().collect { count ->
                _uiState.update { it.copy(activeTaskCount = count) }
            }
        }

        // Load countdowns
        viewModelScope.launch {
            countdownDao.getUpcomingCountdowns(isoDate).collect { countdowns ->
                val nearest = countdowns.firstOrNull()
                if (nearest != null) {
                    try {
                        val targetDate = LocalDate.parse(nearest.targetDate)
                        val daysLeft = ChronoUnit.DAYS.between(today, targetDate)
                        _uiState.update { it.copy(nextCountdown = Pair(nearest.title, daysLeft)) }
                    } catch (_: Exception) {}
                }
            }
        }

        // Insights
        viewModelScope.launch {
            memoryDao.getMemoryCount().collect { count ->
                val insights = mutableListOf<String>()
                if (count > 0) insights.add("شما $count خاطره ثبت کردید ❤️")
                _uiState.update { it.copy(insights = insights) }
            }
        }
    }

    /**
     * Check connection to both GitHub accounts
     */
    fun checkConnection() {
        viewModelScope.launch {
            _uiState.update { it.copy(isCheckingConnection = true) }
            try {
                val status = gitHubRepository.checkConnection()
                _uiState.update {
                    it.copy(
                        myConnected = status.myConnected,
                        partnerConnected = status.partnerConnected,
                        myGitHubUsername = status.myUsername ?: it.myGitHubUsername,
                        partnerGitHubUsername = status.partnerUsername ?: it.partnerGitHubUsername,
                        isCheckingConnection = false,
                        feedbackMessage = when {
                            status.myConnected && status.partnerConnected -> "اتصال هر دو برقرار است ✅"
                            !status.myConnected -> "اتصال شما قطع شده ❌"
                            !status.partnerConnected -> "اتصال پارتنر قطع شده ❌"
                            else -> status.error
                        }
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isCheckingConnection = false,
                        myConnected = false,
                        partnerConnected = false,
                        feedbackMessage = "مشکل در بررسی اتصال: ${e.localizedMessage}"
                    )
                }
            }
        }
    }

    /**
     * Pull-to-refresh — reload everything from GitHub + local
     */
    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true) }

            try {
                // Re-check connection
                val status = gitHubRepository.checkConnection()
                _uiState.update {
                    it.copy(
                        myConnected = status.myConnected,
                        partnerConnected = status.partnerConnected,
                        myGitHubUsername = status.myUsername ?: it.myGitHubUsername,
                        partnerGitHubUsername = status.partnerUsername ?: it.partnerGitHubUsername,
                    )
                }

                // Reload local data
                loadDashboard()

                // Pull ALL data from both tokens' gists into local storage
                val syncResult = syncManager.pullAll()

                _uiState.update {
                    it.copy(
                        isRefreshing = false,
                        feedbackMessage = if (syncResult.error == null)
                            "بروزرسانی و همگام‌سازی از توکن انجام شد ✅"
                        else
                            "همگام‌سازی ناقص: ${syncResult.error}",
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isRefreshing = false,
                        feedbackMessage = "مشکلی پیش اومد: ${e.localizedMessage}",
                    )
                }
            }
        }
    }

    fun clearFeedback() {
        _uiState.update { it.copy(feedbackMessage = null) }
    }
}
