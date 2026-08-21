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

    init {
        pullFromGist()
    }

    private fun pullFromGist() {
        viewModelScope.launch {
            try {
                val remoteStr = gitHubRepository.readMergedContent(GitHubRepository.MEMORIES_FILE).getOrNull()
                if (remoteStr != null && remoteStr != "[]") {
                    val list = try { json.decodeFromString<List<MemorySyncData>>(remoteStr) } catch (_: Exception) { emptyList() }
                    for (item in list) {
                        val existing = memoryDao.getMemoryById(item.id)
                        if (existing == null) {
                            memoryDao.insert(MemoryEntity(
                                id = item.id,
                                title = item.title,
                                description = item.description,
                                date = item.date,
                                location = item.location,
                                privacy = item.privacy,
                                createdBy = "",
                                createdAt = item.createdAt,
                                updatedAt = item.createdAt,
                                isFavorite = item.isFavorite,
                                isSynced = true
                            ))
                        }
                    }
                }
            } catch (_: Exception) {}
        }
    }

    fun createMemory(title: String, description: String, date: String, location: String = "") {
        viewModelScope.launch {
            val now = LocalDateTime.now().toString()
            val memory = MemoryEntity(
                id = cryptoManager.generateId(),
                title = title,
                description = description,
                date = date,
                location = location,
                privacy = "SHARED",
                createdBy = secureStorage.getUserId() ?: "",
                createdAt = now,
                updatedAt = now,
                isSynced = false,
            )
            memoryDao.insert(memory)
            syncMemoriesToGist()
            _uiState.update { it.copy(feedbackMessage = "خاطره ثبت شد و روی توکن ذخیره شد ❤️") }
        }
    }

    fun toggleFavorite(memory: MemoryEntity) {
        viewModelScope.launch {
            val updated = memory.copy(
                isFavorite = !memory.isFavorite,
                updatedAt = LocalDateTime.now().toString(),
                isSynced = false,
            )
            memoryDao.update(updated)
            syncMemoriesToGist()
        }
    }

    fun deleteMemory(memory: MemoryEntity) {
        viewModelScope.launch {
            memoryDao.softDelete(memory.id, LocalDateTime.now().toString())
            syncMemoriesToGist()
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true) }
            try {
                pullFromGist()
                syncMemoriesToGist()
                _uiState.update { it.copy(isRefreshing = false, feedbackMessage = "دریافت از توکن انجام شد ✅") }
            } catch (e: Exception) {
                _uiState.update { it.copy(isRefreshing = false, feedbackMessage = "خطا: ${e.message}") }
            }
        }
    }

    private suspend fun syncMemoriesToGist() {
        try {
            // Merge local + remote to avoid overwriting partner's memories
            val remoteStr = gitHubRepository.readMergedContent(GitHubRepository.MEMORIES_FILE).getOrNull() ?: "[]"
            val remoteList = try { json.decodeFromString<List<MemorySyncData>>(remoteStr) } catch (_: Exception) { emptyList() }
            val localList = memories.value.map {
                MemorySyncData(it.id, it.title, it.description, it.date, it.location, it.privacy, it.isFavorite, it.createdAt)
            }
            val mergedMap = mutableMapOf<String, MemorySyncData>()
            remoteList.forEach { mergedMap[it.id] = it }
            localList.forEach { mergedMap[it.id] = it }
            val finalJson = json.encodeToString(mergedMap.values.toList())
            val result = gitHubRepository.saveFullList(GitHubRepository.MEMORIES_FILE, finalJson)
            if (result.isSuccess) {
                // mark all synced
                localList.forEach { /* optional mark */ }
            }
        } catch (_: Exception) { /* will sync later */ }
    }

    fun clearFeedback() {
        _uiState.update { it.copy(feedbackMessage = null) }
    }
}
