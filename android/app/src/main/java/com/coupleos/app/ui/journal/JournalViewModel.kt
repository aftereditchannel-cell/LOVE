package com.coupleos.app.ui.journal

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.JournalDao
import com.coupleos.app.data.local.entity.JournalEntity
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
import javax.inject.Inject

data class JournalUiState(
    val isRefreshing: Boolean = false,
    val feedbackMessage: String? = null,
)

@Serializable
data class JournalSyncData(
    val id: String,
    val title: String,
    val content: String,
    val mood: String = "",
    val date: String,
    val privacy: String = "PRIVATE",
    val createdBy: String = "",
    val createdAt: String,
)

@HiltViewModel
class JournalViewModel @Inject constructor(
    private val journalDao: JournalDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val gitHubRepository: GitHubRepository,
    private val json: Json,
) : ViewModel() {

    val entries: StateFlow<List<JournalEntity>> = journalDao.getAllEntries()
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    private val _uiState = MutableStateFlow(JournalUiState())
    val uiState: StateFlow<JournalUiState> = _uiState

    init { pullFromGist() }

    private fun pullFromGist() {
        viewModelScope.launch {
            try {
                val remote = gitHubRepository.readMergedContent(GitHubRepository.JOURNAL_FILE).getOrNull()
                if (remote != null && remote != "[]") {
                    val list = try { json.decodeFromString<List<JournalSyncData>>(remote) } catch (_: Exception) { emptyList() }
                    for (item in list) {
                        if (journalDao.getEntryById(item.id) == null) {
                            journalDao.insert(JournalEntity(
                                id = item.id,
                                title = item.title,
                                content = item.content,
                                mood = item.mood,
                                date = item.date,
                                privacy = item.privacy,
                                createdBy = item.createdBy,
                                createdAt = item.createdAt,
                                updatedAt = item.createdAt,
                                isSynced = true
                            ))
                        }
                    }
                }
            } catch (_: Exception) {}
        }
    }

    fun createEntry(title: String, content: String, mood: String, privacy: String) {
        viewModelScope.launch {
            val now = LocalDateTime.now().toString()
            val entry = JournalEntity(
                id = cryptoManager.generateId(),
                title = title,
                content = content,
                mood = mood,
                date = LocalDate.now().toString(),
                privacy = privacy,
                createdBy = secureStorage.getUserId() ?: "",
                createdAt = now,
                updatedAt = now,
                isSynced = false
            )
            journalDao.insert(entry)
            syncToGist()
            _uiState.update { it.copy(feedbackMessage = "یادداشت ثبت و روی توکن ذخیره شد ✅") }
        }
    }

    fun deleteEntry(id: String) {
        viewModelScope.launch {
            journalDao.softDelete(id, LocalDateTime.now().toString())
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
            val remoteStr = gitHubRepository.readMergedContent(GitHubRepository.JOURNAL_FILE).getOrNull() ?: "[]"
            val remoteList = try { json.decodeFromString<List<JournalSyncData>>(remoteStr) } catch (_: Exception) { emptyList() }
            val localList = entries.value.map {
                JournalSyncData(it.id, it.title, it.content, it.mood, it.date, it.privacy, it.createdBy, it.createdAt)
            }
            val merged = mutableMapOf<String, JournalSyncData>()
            remoteList.forEach { merged[it.id] = it }
            localList.forEach { merged[it.id] = it }
            val finalJson = json.encodeToString(merged.values.toList())
            gitHubRepository.saveFullList(GitHubRepository.JOURNAL_FILE, finalJson)
        } catch (_: Exception) {}
    }

    fun clearFeedback() { _uiState.update { it.copy(feedbackMessage = null) } }
}
