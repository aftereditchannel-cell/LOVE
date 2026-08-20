package com.coupleos.app.ui.mood

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.MoodDao
import com.coupleos.app.data.local.entity.MoodEntity
import com.coupleos.app.data.repository.GitHubRepository
import com.coupleos.app.security.crypto.CryptoManager
import com.coupleos.app.security.keystore.SecureStorage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
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

    init { loadTodayMood() }

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
            val moodEntity = MoodEntity(
                id = existing?.id ?: cryptoManager.generateId(),
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

            // 2. Try to sync to GitHub Gist
            try {
                val syncData = MoodSyncData(
                    mood = state.selectedMood,
                    energy = state.energy,
                    stress = state.stress,
                    sleep = state.sleep,
                    loveLevel = state.loveLevel,
                    socialBattery = state.socialBattery,
                    note = state.note,
                    date = today,
                    createdAt = now,
                )

                val result = gitHubRepository.saveToGist(
                    GitHubRepository.MOODS_FILE,
                    json.encodeToString(listOf(syncData))
                )

                if (result.isSuccess) {
                    moodDao.markSynced(moodEntity.id)
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            saved = true,
                            feedbackMessage = "ثبت شد و در GitHub ذخیره شد ✅",
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            saved = true,
                            feedbackMessage = "ثبت شد (لوکال) — مشکل در GitHub: ${result.exceptionOrNull()?.message}",
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        saved = true,
                        feedbackMessage = "ثبت شد (لوکال) — اتصال GitHub برقرار نیست",
                    )
                }
            }
        }
    }
}
