package com.coupleos.app.ui.memories

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.MemoryDao
import com.coupleos.app.data.local.entity.MemoryEntity
import com.coupleos.app.data.repository.CoupleSyncRepository
import com.coupleos.app.security.crypto.CryptoManager
import com.coupleos.app.security.keystore.SecureStorage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import javax.inject.Inject

data class MemoriesUiState(
    val isRefreshing: Boolean = false,
    val feedbackMessage: String? = null,
)

@HiltViewModel
class MemoriesViewModel @Inject constructor(
    private val memoryDao: MemoryDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val syncRepository: CoupleSyncRepository,
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

            val result = syncRepository.push()
            _uiState.update {
                it.copy(
                    feedbackMessage = if (result.ok) "خاطره ثبت و روی توکن ذخیره شد ❤️"
                    else "خاطره ثبت شد (لوکال) — ${result.message}"
                )
            }
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
            syncRepository.push()
        }
    }

    fun deleteMemory(memory: MemoryEntity) {
        viewModelScope.launch {
            memoryDao.softDelete(memory.id, LocalDateTime.now().toString())
            syncRepository.push()
            _uiState.update { it.copy(feedbackMessage = "حذف شد") }
        }
    }

    /** Pull-to-refresh: real two-way sync with both tokens. */
    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true) }
            val result = syncRepository.sync()
            _uiState.update {
                it.copy(isRefreshing = false, feedbackMessage = result.message)
            }
        }
    }

    fun clearFeedback() {
        _uiState.update { it.copy(feedbackMessage = null) }
    }
}
