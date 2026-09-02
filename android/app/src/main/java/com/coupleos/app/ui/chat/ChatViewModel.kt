package com.coupleos.app.ui.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.MessageDao
import com.coupleos.app.data.local.entity.MessageEntity
import com.coupleos.app.data.repository.GitHubRepository
import com.coupleos.app.data.repository.TokenOwnership
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

data class ChatUiState(
    val currentUserId: String = "",
    val partnerName: String = "",
    val messageText: String = "",
    val isPartnerTyping: Boolean = false,
    val isLoading: Boolean = false,
    val feedbackMessage: String? = null,
    val isRefreshing: Boolean = false,
)

@Serializable
data class MessageSyncData(
    val id: String,
    val coupleId: String,
    val senderId: String,
    val content: String,
    val type: String = "TEXT",
    val createdAt: String,
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val messageDao: MessageDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val gitHubRepository: GitHubRepository,
    private val json: Json,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChatUiState(
        currentUserId = secureStorage.getUserId() ?: "",
        partnerName = secureStorage.getPartnerName(),
    ))
    val uiState: StateFlow<ChatUiState> = _uiState

    val messages: StateFlow<List<MessageEntity>> = messageDao
        .getRecentMessages(secureStorage.getCoupleId() ?: "", 100)
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    init {
        pullFromGist()
    }

    private fun pullFromGist() {
        viewModelScope.launch {
            try {
                val remote = gitHubRepository.readMergedContent(GitHubRepository.MESSAGES_FILE).getOrNull()
                if (remote != null && remote != "[]") {
                    val list = try { json.decodeFromString<List<MessageSyncData>>(remote) } catch (_: Exception) { emptyList() }
                    for (item in list) {
                        val existing = messageDao.getMessageById(item.id)
                        if (existing == null) {
                            messageDao.insert(MessageEntity(
                                id = item.id,
                                // Partner devices generate their own coupleId; normalize it so
                                // their messages (read-only) still appear in my thread.
                                coupleId = secureStorage.getCoupleId() ?: item.coupleId,
                                senderId = item.senderId,
                                content = item.content,
                                type = item.type,
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

            // Register on MY token only
            val r = syncToGist()
            _uiState.update { it.copy(feedbackMessage = if (r.isSuccess) "پیام روی توکن خودت ثبت شد ✅" else TokenOwnership.failed(r.exceptionOrNull())) }
        }
    }

    fun isReadOnly(id: String) = gitHubRepository.isReadOnly(GitHubRepository.MESSAGES_FILE, id)

    fun deleteMessage(id: String) {
        viewModelScope.launch {
            if (isReadOnly(id)) { _uiState.update { it.copy(feedbackMessage = "این پیام از توکن پارتنرته — نمی‌تونی حذفش کنی 👁️") }; return@launch }
            messageDao.softDelete(id, LocalDateTime.now().toString())
            val r = gitHubRepository.removeFromList(GitHubRepository.MESSAGES_FILE, id)
            syncToGist()
            _uiState.update { it.copy(feedbackMessage = if (r.isSuccess) "پیام از توکن خودت حذف شد ✅" else TokenOwnership.failed(r.exceptionOrNull())) }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true) }
            pullFromGist()
            syncToGist()
            _uiState.update { it.copy(isRefreshing = false, feedbackMessage = "بازخوانی شد ✅ — پیام‌های پارتنر از توکن خودش خونده شد 👁️") }
            kotlinx.coroutines.delay(2000)
            _uiState.update { it.copy(feedbackMessage = null) }
        }
    }

    private suspend fun syncToGist(): Result<Unit> {
        return try {
            val remoteStr = gitHubRepository.readMergedContent(GitHubRepository.MESSAGES_FILE).getOrNull() ?: "[]"
            val remoteList = try { json.decodeFromString<List<MessageSyncData>>(remoteStr) } catch (_: Exception) { emptyList() }
            // Get local last 100 messages
            val localList = messages.value.map {
                MessageSyncData(it.id, it.coupleId, it.senderId, it.content, it.type, it.createdAt)
            }
            val merged = mutableMapOf<String, MessageSyncData>()
            remoteList.forEach { merged[it.id] = it }
            localList.forEach { merged[it.id] = it }
            val finalJson = json.encodeToString(merged.values.toList().sortedBy { it.createdAt })
            gitHubRepository.saveFullList(GitHubRepository.MESSAGES_FILE, finalJson)
        } catch (e: Exception) { Result.failure(e) }
    }

    fun clearFeedback() { _uiState.update { it.copy(feedbackMessage = null) } }
}
