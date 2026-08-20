package com.coupleos.app.ui.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.MessageDao
import com.coupleos.app.data.local.entity.MessageEntity
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
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val messageDao: MessageDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChatUiState(
        currentUserId = secureStorage.getUserId() ?: "",
        partnerName = secureStorage.getPartnerName(),
    ))
    val uiState: StateFlow<ChatUiState> = _uiState

    val messages: StateFlow<List<MessageEntity>> = messageDao
        .getRecentMessages(secureStorage.getCoupleId() ?: "", 100)
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

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

            // TODO: Push to backend via sync queue
        }
    }
}
