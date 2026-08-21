package com.coupleos.app.ui.setup

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.remote.api.CoupleOSApi
import com.coupleos.app.data.remote.dto.PairRequest
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
    private val api: CoupleOSApi,
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
                        successMessage = "✅ اتصال برقرار شد — ${user.login} (دیتا روی توکن ثبت میشه)",
                        error = null,
                    )
                }
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

            // Save everything to secure storage FIRST (so token data is locally available)
            secureStorage.savePersonalToken(state.personalToken.trim())
            secureStorage.savePartnerToken(state.partnerToken.trim())
            secureStorage.saveSessionToken(cryptoManager.generateId())
            secureStorage.saveUserRole(state.selectedRole)
            secureStorage.saveUserId(userId)
            secureStorage.saveCoupleId(coupleId)
            secureStorage.saveDeviceId(deviceId)
            state.myGitHubUsername?.let { secureStorage.saveMyGitHubUsername(it) }
            state.partnerGitHubUsername?.let { secureStorage.savePartnerGitHubUsername(it) }

            // Try to create/find Gists on BOTH tokens — this is where data will be registered
            var gistSuccess = false
            try {
                val (myGist, partnerGist) = gitHubRepository.ensureBothGists()
                if (myGist != null) {
                    secureStorage.saveMyGistId(myGist)
                    gistSuccess = true
                }
                if (partnerGist != null) {
                    secureStorage.savePartnerGistId(partnerGist)
                    gistSuccess = true
                }
                // Also save legacy gistId
                myGist?.let { secureStorage.saveGistId(it) }
                
                if (gistSuccess) {
                    // Write initial test data to verify token can store/receive
                    val testData = """[{"id":"welcome-${System.currentTimeMillis()}","title":"شروع دنیای ما ❤️","description":"دنیای کوچیک ما با موفقیت روی توکن ساخته شد","date":"${java.time.LocalDate.now()}","location":"","privacy":"SHARED","isFavorite":true,"createdAt":"${java.time.LocalDateTime.now()}"}]"""
                    gitHubRepository.saveFullList(GitHubRepository.MEMORIES_FILE, testData)
                }
            } catch (e: Exception) {
                // Even if Gist creation fails, we still pair locally — will retry later
                gistSuccess = false
            }

            // Also try backend pairing if backend is reachable (optional)
            try {
                val deviceName = android.os.Build.MODEL ?: "Android Device"
                val apiResult = api.pairDevice(PairRequest(
                    personalToken = state.personalToken.trim(),
                    partnerToken = state.partnerToken.trim(),
                    role = state.selectedRole,
                    deviceName = deviceName,
                    deviceId = deviceId
                ))
                if (apiResult.isSuccessful && apiResult.body() != null) {
                    val body = apiResult.body()!!
                    secureStorage.saveSessionToken(body.sessionToken)
                    secureStorage.saveUserId(body.userId)
                    secureStorage.saveCoupleId(body.coupleId)
                }
            } catch (_: Exception) {
                // Backend not available — GitHub token storage is primary
            }

            secureStorage.setIsPaired(true)

            _uiState.update {
                it.copy(
                    step = SetupStep.COMPLETE,
                    isLoading = false,
                    successMessage = if (gistSuccess) "❤️ اتصال و ذخیره روی توکن انجام شد!" else "❤️ اتصال برقرار شد! (همگام سازی توکن بزودی)",
                )
            }

            delay(1800)
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
