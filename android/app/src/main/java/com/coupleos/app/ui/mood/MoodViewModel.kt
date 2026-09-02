package com.coupleos.app.ui.mood

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.MoodDao
import com.coupleos.app.data.local.entity.MoodEntity
import com.coupleos.app.data.repository.GitHubRepository
import com.coupleos.app.data.repository.TokenOwnership
import com.coupleos.app.security.crypto.CryptoManager
import com.coupleos.app.security.keystore.SecureStorage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.LocalDate
import java.time.LocalDateTime
import javax.inject.Inject

data class MoodUiState(
    val selectedMood: String? = null,
    val energy: Int = 5,
    val stress: Int = 5,
    val sleep: Int = 5,
    val loveLevel: Int = 5,
    val socialBattery: Int = 5,
    val note: String = "",
    val saved: Boolean = false,
    val feedbackMessage: String? = null,
    val isSaving: Boolean = false,
)

@Serializable
data class MoodSyncData(
    val id: String = "",
    val userId: String = "",
    val mood: String,
    val energy: Int,
    val stress: Int,
    val sleep: Int,
    val loveLevel: Int,
    val socialBattery: Int,
    val note: String,
    val date: String,
    val createdAt: String,
)

@HiltViewModel
class MoodViewModel @Inject constructor(
    private val moodDao: MoodDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val gitHubRepository: GitHubRepository,
    private val json: Json,
) : ViewModel() {

    private val _uiState = MutableStateFlow(MoodUiState())
    val uiState: StateFlow<MoodUiState> = _uiState

    init { 
        loadTodayMood()
        pullRemoteMoods()
    }

    private fun loadTodayMood() {
        viewModelScope.launch {
            val userId = secureStorage.getUserId() ?: return@launch
            val existing = moodDao.getMoodByDate(userId, LocalDate.now().toString())
            if (existing != null) {
                _uiState.update {
                    it.copy(
                        selectedMood = existing.mood,
                        energy = existing.energy,
                        stress = existing.stress,
                        sleep = existing.sleep,
                        loveLevel = existing.loveLevel,
                        socialBattery = existing.socialBattery,
                        note = existing.note,
                    )
                }
            }
        }
    }

    private fun pullRemoteMoods() {
        viewModelScope.launch {
            try {
                val remote = gitHubRepository.readMergedContent(GitHubRepository.MOODS_FILE).getOrNull()
                if (remote != null && remote != "[]") {
                    val list = try { json.decodeFromString<List<MoodSyncData>>(remote) } catch (_: Exception) { emptyList() }
                    for (item in list) {
                        val existing = moodDao.getMoodByDate(item.userId, item.date)
                        if (existing == null) {
                            moodDao.insert(MoodEntity(
                                id = item.id.ifEmpty { cryptoManager.generateId() },
                                userId = item.userId,
                                mood = item.mood,
                                energy = item.energy,
                                stress = item.stress,
                                sleep = item.sleep,
                                loveLevel = item.loveLevel,
                                socialBattery = item.socialBattery,
                                note = item.note,
                                date = item.date,
                                createdAt = item.createdAt,
                                isSynced = true
                            ))
                        }
                    }
                    // Reload today after pull
                    loadTodayMood()
                }
            } catch (_: Exception) {}
        }
    }

    fun selectMood(mood: String) { _uiState.update { it.copy(selectedMood = mood) } }
    fun updateEnergy(value: Int) { _uiState.update { it.copy(energy = value) } }
    fun updateStress(value: Int) { _uiState.update { it.copy(stress = value) } }
    fun updateSleep(value: Int) { _uiState.update { it.copy(sleep = value) } }
    fun updateLoveLevel(value: Int) { _uiState.update { it.copy(loveLevel = value) } }
    fun updateSocialBattery(value: Int) { _uiState.update { it.copy(socialBattery = value) } }
    fun updateNote(note: String) { _uiState.update { it.copy(note = note) } }

    fun saveMood() {
        val state = _uiState.value
        if (state.selectedMood == null) return

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true) }

            val userId = secureStorage.getUserId() ?: run {
                _uiState.update { it.copy(isSaving = false, feedbackMessage = "مشکل: کاربر مشخص نیست") }
                return@launch
            }
            val today = LocalDate.now().toString()
            val now = LocalDateTime.now().toString()
            val existing = moodDao.getMoodByDate(userId, today)

            // 1. Save to local Room DB
            val moodId = existing?.id ?: cryptoManager.generateId()
            val moodEntity = MoodEntity(
                id = moodId,
                userId = userId,
                mood = state.selectedMood,
                energy = state.energy,
                stress = state.stress,
                sleep = state.sleep,
                loveLevel = state.loveLevel,
                socialBattery = state.socialBattery,
                note = state.note,
                date = today,
                createdAt = existing?.createdAt ?: now,
                isSynced = false,
            )
            moodDao.insert(moodEntity)

            // 2. Sync to GitHub Gist — save FULL list merged so data is truly on token
            try {
                // Collect all local moods to push complete history
                val allMoods = moodDao.getMoodsByUser(userId).first()
                val syncList = allMoods.map {
                    MoodSyncData(
                        id = it.id,
                        userId = it.userId,
                        mood = it.mood,
                        energy = it.energy,
                        stress = it.stress,
                        sleep = it.sleep,
                        loveLevel = it.loveLevel,
                        socialBattery = it.socialBattery,
                        note = it.note,
                        date = it.date,
                        createdAt = it.createdAt
                    )
                }
                // Also merge with remote to avoid overwriting partner's moods
                val remoteStr = gitHubRepository.readMergedContent(GitHubRepository.MOODS_FILE).getOrNull()
                val remoteList = if (remoteStr != null) try { json.decodeFromString<List<MoodSyncData>>(remoteStr) } catch (_: Exception) { emptyList() } else emptyList()
                val mergedMap = mutableMapOf<String, MoodSyncData>()
                // remote first
                remoteList.forEach { mergedMap["${it.userId}-${it.date}"] = it }
                // local overrides
                syncList.forEach { mergedMap["${it.userId}-${it.date}"] = it }
                val finalList = mergedMap.values.toList()
                val finalJson = json.encodeToString(finalList)

                val result = gitHubRepository.saveFullList(GitHubRepository.MOODS_FILE, finalJson)

                if (result.isSuccess) {
                    moodDao.markSynced(moodId)
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            saved = true,
                            feedbackMessage = TokenOwnership.saved("حال امروزت"),
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            saved = true,
                            feedbackMessage = TokenOwnership.failed(result.exceptionOrNull()),
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        saved = true,
                        feedbackMessage = TokenOwnership.failed(e),
                    )
                }
            }
        }
    }

    fun refreshFromToken() {
        pullRemoteMoods()
    }
}
