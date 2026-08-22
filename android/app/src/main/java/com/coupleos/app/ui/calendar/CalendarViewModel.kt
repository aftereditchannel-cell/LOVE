package com.coupleos.app.ui.calendar

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.CalendarDao
import com.coupleos.app.data.local.entity.CalendarEventEntity
import com.coupleos.app.data.repository.GitHubRepository
import com.coupleos.app.security.crypto.CryptoManager
import com.coupleos.app.security.keystore.SecureStorage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.YearMonth
import javax.inject.Inject

data class CalendarUiState(
    val currentMonth: YearMonth = YearMonth.now(),
    val selectedDate: LocalDate = LocalDate.now(),
    val eventDates: Set<String> = emptySet(),
    val isRefreshing: Boolean = false,
    val feedbackMessage: String? = null,
)

@Serializable
data class CalendarSyncData(
    val id: String,
    val title: String,
    val description: String,
    val date: String,
    val endDate: String = "",
    val type: String = "CUSTOM",
    val isRecurring: Boolean = false,
    val hasReminder: Boolean = true,
    val reminderMinutes: Int = 30,
    val createdBy: String = "",
    val createdAt: String = "",
)

@HiltViewModel
class CalendarViewModel @Inject constructor(
    private val calendarDao: CalendarDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val gitHubRepository: GitHubRepository,
    private val json: Json,
) : ViewModel() {

    private val _uiState = MutableStateFlow(CalendarUiState())
    val uiState: StateFlow<CalendarUiState> = _uiState

    val events: StateFlow<List<CalendarEventEntity>> = calendarDao
        .getAllEvents()
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    init {
        viewModelScope.launch {
            events.collect { allEvents ->
                _uiState.update {
                    it.copy(eventDates = allEvents.map { e -> e.date }.toSet())
                }
            }
        }
        pullFromGist()
    }

    private fun pullFromGist() {
        viewModelScope.launch {
            try {
                val remote = gitHubRepository.readMergedContent(GitHubRepository.CALENDAR_FILE).getOrNull()
                if (remote != null && remote != "[]") {
                    val list = try { json.decodeFromString<List<CalendarSyncData>>(remote) } catch (_: Exception) { emptyList() }
                    for (item in list) {
                        // Check if exists by id
                        val exists = events.value.any { it.id == item.id }
                        if (!exists) {
                            calendarDao.insert(CalendarEventEntity(
                                id = item.id,
                                title = item.title,
                                description = item.description,
                                date = item.date,
                                endDate = item.endDate,
                                type = item.type,
                                isRecurring = item.isRecurring,
                                hasReminder = item.hasReminder,
                                reminderMinutes = item.reminderMinutes,
                                createdBy = item.createdBy,
                                createdAt = item.createdAt.ifEmpty { LocalDateTime.now().toString() },
                                updatedAt = item.createdAt.ifEmpty { LocalDateTime.now().toString() },
                                isSynced = true
                            ))
                        }
                    }
                }
            } catch (_: Exception) {}
        }
    }

    fun selectDate(date: LocalDate) {
        _uiState.update { it.copy(selectedDate = date) }
    }

    fun previousMonth() {
        _uiState.update { it.copy(currentMonth = it.currentMonth.minusMonths(1)) }
    }

    fun nextMonth() {
        _uiState.update { it.copy(currentMonth = it.currentMonth.plusMonths(1)) }
    }

    fun createEvent(title: String, description: String, date: String) {
        viewModelScope.launch {
            val now = LocalDateTime.now().toString()
            val event = CalendarEventEntity(
                id = cryptoManager.generateId(),
                title = title,
                description = description,
                date = date,
                createdBy = secureStorage.getUserId() ?: "",
                createdAt = now,
                updatedAt = now,
                isSynced = false,
            )
            calendarDao.insert(event)
            syncToGist()
            _uiState.update { it.copy(feedbackMessage = "رویداد ذخیره شد روی توکن ✅") }
        }
    }

    fun deleteEvent(id: String) {
        viewModelScope.launch {
            calendarDao.softDelete(id, LocalDateTime.now().toString())
            gitHubRepository.removeFromList(GitHubRepository.CALENDAR_FILE, id)
            syncToGist()
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true) }
            pullFromGist()
            syncToGist()
            _uiState.update { it.copy(isRefreshing = false, feedbackMessage = "همگام سازی شد ✅") }
            kotlinx.coroutines.delay(2000)
            _uiState.update { it.copy(feedbackMessage = null) }
        }
    }

    private suspend fun syncToGist() {
        try {
            val remoteStr = gitHubRepository.readMergedContent(GitHubRepository.CALENDAR_FILE).getOrNull() ?: "[]"
            val remoteList = try { json.decodeFromString<List<CalendarSyncData>>(remoteStr) } catch (_: Exception) { emptyList() }
            val localList = events.value.map {
                CalendarSyncData(it.id, it.title, it.description, it.date, it.endDate, it.type, it.isRecurring, it.hasReminder, it.reminderMinutes, it.createdBy, it.createdAt)
            }
            val merged = mutableMapOf<String, CalendarSyncData>()
            remoteList.forEach { merged[it.id] = it }
            localList.forEach { merged[it.id] = it }
            val finalJson = json.encodeToString(merged.values.toList())
            gitHubRepository.saveFullList(GitHubRepository.CALENDAR_FILE, finalJson)
        } catch (_: Exception) {}
    }

    fun clearFeedback() { _uiState.update { it.copy(feedbackMessage = null) } }
}
