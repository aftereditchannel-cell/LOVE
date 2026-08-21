package com.coupleos.app.ui.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.MessageDao
import com.coupleos.app.data.local.entity.MessageEntity
import com.coupleos.app.data.repository.CoupleSyncRepository
import com.coupleos.app.security.crypto.CryptoManager
import com.coupleos.app.security.keystore.SecureStorage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import javax.inject.Inject

data class ChatUiState(
    val currentUserId: String = "",
    val partnerName: String = "",
    val messageText: String = "",
    val isPartnerTyping: Boolean = false,
    val isLoading: Boolean = false,
    val isSyncing: Boolean = false,
    val feedbackMessage: String? = null,
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val messageDao: MessageDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val syncRepository: CoupleSyncRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        ChatUiState(
            currentUserId = secureStorage.getUserId() ?: "",
            partnerName = secureStorage.getPartnerName(),
        )
    )
    val uiState: StateFlow<ChatUiState> = _uiState

    /**
     * Messages coming from the partner were written with THEIR coupleId, so we
     * must not filter by our own local coupleId or the conversation would look
     * empty after a sync. We show every non-deleted message instead.
     */
    val messages: StateFlow<List<MessageEntity>> = messageDao
        .observeAllMessages()
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    init {
        // Pick up anything the partner wrote while we were away.
        refresh()
    }

    fun updateMessageText(text: String) {
        _uiState.update { it.copy(messageText = text) }
    }

    fun sendMessage() {
        val text = _uiState.value.messageText.trim()
        if (text.isBlank()) return

        viewModelScope.launch {
            val now = LocalDateTime.now().toString()
            val message = MessageEntity(
                id = cryptoManager.generateId(),
                coupleId = secureStorage.getCoupleId() ?: "",
                senderId = secureStorage.getUserId() ?: "",
                content = text,
                type = "TEXT",
                createdAt = now,
                updatedAt = now,
                isSynced = false,
            )

            messageDao.insert(message)
            _uiState.update { it.copy(messageText = "") }

            // Actually persist the message onto the GitHub token.
            val result = syncRepository.push()
            if (!result.ok) {
                _uiState.update { it.copy(feedbackMessage = "پیام لوکال ذخیره شد — ${result.message}") }
            }
        }
    }

    fun deleteMessage(message: MessageEntity) {
        viewModelScope.launch {
            messageDao.softDelete(message.id, LocalDateTime.now().toString())
            syncRepository.push()
        }
    }

    fun togglePin(message: MessageEntity) {
        viewModelScope.launch {
            messageDao.update(
                message.copy(
                    isPinned = !message.isPinned,
                    updatedAt = LocalDateTime.now().toString(),
                    isSynced = false,
                )
            )
            syncRepository.push()
        }
    }

    /** Pull new messages from both gists. */
    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isSyncing = true) }
            val result = syncRepository.sync()
            _uiState.update {
                it.copy(
                    isSyncing = false,
                    feedbackMessage = if (result.ok) null else result.message,
                )
            }
        }
    }

    fun clearFeedback() {
        _uiState.update { it.copy(feedbackMessage = null) }
    }
}
