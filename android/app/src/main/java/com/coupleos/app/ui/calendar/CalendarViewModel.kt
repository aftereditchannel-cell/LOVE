package com.coupleos.app.ui.calendar

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.CalendarDao
import com.coupleos.app.data.local.entity.CalendarEventEntity
import com.coupleos.app.security.crypto.CryptoManager
import com.coupleos.app.security.keystore.SecureStorage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.YearMonth
import javax.inject.Inject

data class CalendarUiState(
    val currentMonth: YearMonth = YearMonth.now(),
    val selectedDate: LocalDate = LocalDate.now(),
    val eventDates: Set<String> = emptySet(),
)

@HiltViewModel
class CalendarViewModel @Inject constructor(
    private val calendarDao: CalendarDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
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
        }
    }
}
