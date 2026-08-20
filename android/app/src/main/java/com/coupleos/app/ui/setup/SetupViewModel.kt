package com.coupleos.app.ui.setup

import android.os.Build
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.repository.GitHubRepository
import com.coupleos.app.security.crypto.CryptoManager
import com.coupleos.app.security.keystore.SecureStorage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class SetupStep {
    CHOOSE_PERSON,
    ENTER_PERSONAL_TOKEN,
    VALIDATING_PERSONAL,
    ENTER_PARTNER_TOKEN,
    VALIDATING_PARTNER,
    PAIRING,
    COMPLETE,
}

data class SetupUiState(
    val step: SetupStep = SetupStep.CHOOSE_PERSON,
    val selectedRole: String = "",
    val personAName: String = "امیر",
    val personBName: String = "ستایش",
    val personalToken: String = "",
    val partnerToken: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
    val isPaired: Boolean = false,
    val myGitHubUsername: String? = null,
    val partnerGitHubUsername: String? = null,
)

@HiltViewModel
class SetupViewModel @Inject constructor(
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val gitHubRepository: GitHubRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SetupUiState(
        personAName = secureStorage.getPersonAName(),
        personBName = secureStorage.getPersonBName(),
    ))
    val uiState: StateFlow<SetupUiState> = _uiState

    fun selectPerson(role: String) {
        _uiState.update {
            it.copy(
                selectedRole = role,
                step = SetupStep.ENTER_PERSONAL_TOKEN,
                error = null,
                successMessage = null,
            )
        }
    }

    fun updatePersonalToken(token: String) {
        _uiState.update { it.copy(personalToken = token, error = null) }
    }

    fun updatePartnerToken(token: String) {
        _uiState.update { it.copy(partnerToken = token, error = null) }
    }

    /**
     * Validate personal GitHub token by calling GitHub API /user
     */
    fun validatePersonalToken() {
        val token = _uiState.value.personalToken.trim()
        if (token.isBlank()) {
            _uiState.update { it.copy(error = "توکن خالی است") }
            return
        }
        if (!token.startsWith("ghp_") && !token.startsWith("github_pat_")) {
            _uiState.update { it.copy(error = "توکن باید با ghp_ یا github_pat_ شروع شه") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, step = SetupStep.VALIDATING_PERSONAL) }

            val result = gitHubRepository.validateToken(token)

            if (result.isSuccess) {
                val user = result.getOrNull()!!
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        step = SetupStep.ENTER_PARTNER_TOKEN,
                        myGitHubUsername = user.login,
                        successMessage = "✅ اتصال برقرار شد — ${user.login}",
                        error = null,
                    )
                }
                // Clear success after 3 seconds
                delay(3000)
                _uiState.update { it.copy(successMessage = null) }
            } else {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        step = SetupStep.ENTER_PERSONAL_TOKEN,
                        error = result.exceptionOrNull()?.message ?: "توکن نامعتبر",
                    )
                }
            }
        }
    }

    /**
     * Validate partner GitHub token and then pair
     */
    fun validateAndPair() {
        val token = _uiState.value.partnerToken.trim()
        if (token.isBlank()) {
            _uiState.update { it.copy(error = "توکن پارتنر خالی است") }
            return
        }
        if (!token.startsWith("ghp_") && !token.startsWith("github_pat_")) {
            _uiState.update { it.copy(error = "توکن باید با ghp_ یا github_pat_ شروع شه") }
            return
        }
        if (token == _uiState.value.personalToken) {
            _uiState.update { it.copy(error = "توکن پارتنر نباید با توکن خودت یکی باشه") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, step = SetupStep.VALIDATING_PARTNER) }

            val result = gitHubRepository.validateToken(token)

            if (result.isSuccess) {
                val partnerUser = result.getOrNull()!!
                _uiState.update {
                    it.copy(
                        partnerGitHubUsername = partnerUser.login,
                        successMessage = "✅ پارتنر پیدا شد — ${partnerUser.login}",
                    )
                }
                // Now do the actual pairing
                performPairing()
            } else {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        step = SetupStep.ENTER_PARTNER_TOKEN,
                        error = result.exceptionOrNull()?.message ?: "توکن پارتنر نامعتبر",
                    )
                }
            }
        }
    }

    private suspend fun performPairing() {
        try {
            _uiState.update { it.copy(step = SetupStep.PAIRING) }

            val state = _uiState.value
            val deviceId = cryptoManager.generateDeviceId()
            val userId = cryptoManager.generateId()
            val coupleId = cryptoManager.generateId()

            // Save everything to secure storage
            secureStorage.savePersonalToken(state.personalToken.trim())
            secureStorage.savePartnerToken(state.partnerToken.trim())
            secureStorage.saveSessionToken(cryptoManager.generateId())
            secureStorage.saveUserRole(state.selectedRole)
            secureStorage.saveUserId(userId)
            secureStorage.saveCoupleId(coupleId)
            secureStorage.saveDeviceId(deviceId)
            state.myGitHubUsername?.let { secureStorage.saveMyGitHubUsername(it) }
            state.partnerGitHubUsername?.let { secureStorage.savePartnerGitHubUsername(it) }

            // Try to create/find the shared Gist on GitHub
            val gistResult = gitHubRepository.getOrCreateSharedGist()
            if (gistResult.isSuccess) {
                secureStorage.saveGistId(gistResult.getOrNull()!!)
            }
            // Even if Gist creation fails, we still pair locally

            secureStorage.setIsPaired(true)

            _uiState.update {
                it.copy(
                    step = SetupStep.COMPLETE,
                    isLoading = false,
                    successMessage = "❤️ اتصال برقرار شد!",
                )
            }

            delay(2000)
            _uiState.update { it.copy(isPaired = true) }

        } catch (e: Exception) {
            _uiState.update {
                it.copy(
                    isLoading = false,
                    step = SetupStep.ENTER_PARTNER_TOKEN,
                    error = "مشکلی پیش اومد: ${e.localizedMessage}",
                )
            }
        }
    }

    fun goBack() {
        _uiState.update {
            when (it.step) {
                SetupStep.ENTER_PERSONAL_TOKEN, SetupStep.VALIDATING_PERSONAL ->
                    it.copy(step = SetupStep.CHOOSE_PERSON, error = null, successMessage = null)
                SetupStep.ENTER_PARTNER_TOKEN, SetupStep.VALIDATING_PARTNER ->
                    it.copy(step = SetupStep.ENTER_PERSONAL_TOKEN, error = null, successMessage = null)
                else -> it
            }
        }
    }
}
