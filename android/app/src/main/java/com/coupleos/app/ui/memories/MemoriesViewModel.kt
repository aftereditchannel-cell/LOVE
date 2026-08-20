package com.coupleos.app.ui.memories

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.MemoryDao
import com.coupleos.app.data.local.entity.MemoryEntity
import com.coupleos.app.data.repository.GitHubRepository
import com.coupleos.app.security.crypto.CryptoManager
import com.coupleos.app.security.keystore.SecureStorage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.LocalDateTime
import javax.inject.Inject

data class MemoriesUiState(
    val isRefreshing: Boolean = false,
    val feedbackMessage: String? = null,
)

@Serializable
data class MemorySyncData(
    val id: String,
    val title: String,
    val description: String,
    val date: String,
    val location: String,
    val privacy: String,
    val isFavorite: Boolean,
    val createdAt: String,
)

@HiltViewModel
class MemoriesViewModel @Inject constructor(
    private val memoryDao: MemoryDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val gitHubRepository: GitHubRepository,
    private val json: Json,
) : ViewModel() {

    val memories: StateFlow<List<MemoryEntity>> = memoryDao
        .getAllMemories()
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    private val _uiState = MutableStateFlow(MemoriesUiState())
    val uiState: StateFlow<MemoriesUiState> = _uiState

    fun createMemory(title: String, description: String, date: String) {
        viewModelScope.launch {
            val now = LocalDateTime.now().toString()
            val memory = MemoryEntity(
                id = cryptoManager.generateId(),
                title = title,
                description = description,
                date = date,
                privacy = "SHARED",
                createdBy = secureStorage.getUserId() ?: "",
                createdAt = now,
                updatedAt = now,
                isSynced = false,
            )
            memoryDao.insert(memory)

            // Sync to GitHub
            syncMemoriesToGist()

            _uiState.update { it.copy(feedbackMessage = "خاطره ثبت شد ❤️") }
        }
    }

    fun toggleFavorite(memory: MemoryEntity) {
        viewModelScope.launch {
            memoryDao.update(
                memory.copy(
                    isFavorite = !memory.isFavorite,
                    updatedAt = LocalDateTime.now().toString(),
                    isSynced = false,
                )
            )
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true) }
            try {
                syncMemoriesToGist()
                _uiState.update { it.copy(isRefreshing = false, feedbackMessage = "بروزرسانی شد ✅") }
            } catch (e: Exception) {
                _uiState.update { it.copy(isRefreshing = false, feedbackMessage = "مشکلی پیش اومد") }
            }
        }
    }

    private suspend fun syncMemoriesToGist() {
        try {
            val allMemories = memories.value
            val syncData = allMemories.map {
                MemorySyncData(it.id, it.title, it.description, it.date, it.location, it.privacy, it.isFavorite, it.createdAt)
            }
            gitHubRepository.saveToGist(GitHubRepository.MEMORIES_FILE, json.encodeToString(syncData))
        } catch (_: Exception) { /* will sync later */ }
    }

    fun clearFeedback() {
        _uiState.update { it.copy(feedbackMessage = null) }
    }
}
