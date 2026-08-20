package com.coupleos.app.ui.lock

import androidx.lifecycle.ViewModel
import com.coupleos.app.security.crypto.CryptoManager
import com.coupleos.app.security.keystore.SecureStorage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject

data class LockUiState(
    val enteredPin: String = "",
    val isConfirming: Boolean = false,
    val firstPin: String = "",
    val error: String? = null,
    val isUnlocked: Boolean = false,
)

@HiltViewModel
class LockViewModel @Inject constructor(
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LockUiState())
    val uiState: StateFlow<LockUiState> = _uiState

    // Setup mode — user creates a new PIN
    fun onSetupDigit(digit: Int) {
        val current = _uiState.value.enteredPin
        if (current.length >= 4) return

        val newPin = current + digit.toString()
        _uiState.update { it.copy(enteredPin = newPin, error = null) }

        if (newPin.length == 4) {
            if (!_uiState.value.isConfirming) {
                // First entry — ask to confirm
                _uiState.update {
                    it.copy(
                        firstPin = newPin,
                        enteredPin = "",
                        isConfirming = true,
                    )
                }
            } else {
                // Confirming
                if (newPin == _uiState.value.firstPin) {
                    // PIN matches — save
                    val hash = cryptoManager.hashPin(newPin)
                    secureStorage.savePinHash(hash)
                    secureStorage.setLockSetupDone(true)
                    _uiState.update { it.copy(isUnlocked = true) }
                } else {
                    // Mismatch
                    _uiState.update {
                        it.copy(
                            enteredPin = "",
                            isConfirming = false,
                            firstPin = "",
                            error = "رمز مطابقت ندارد. دوباره تلاش کنید.",
                        )
                    }
                }
            }
        }
    }

    // Unlock mode — user enters existing PIN
    fun onUnlockDigit(digit: Int) {
        val current = _uiState.value.enteredPin
        if (current.length >= 4) return

        val newPin = current + digit.toString()
        _uiState.update { it.copy(enteredPin = newPin, error = null) }

        if (newPin.length == 4) {
            val savedHash = secureStorage.getPinHash()
            if (savedHash != null && cryptoManager.verifyPin(newPin, savedHash)) {
                _uiState.update { it.copy(isUnlocked = true) }
            } else {
                _uiState.update {
                    it.copy(
                        enteredPin = "",
                        error = "رمز اشتباه",
                    )
                }
            }
        }
    }

    fun onDelete() {
        val current = _uiState.value.enteredPin
        if (current.isNotEmpty()) {
            _uiState.update { it.copy(enteredPin = current.dropLast(1), error = null) }
        }
    }

    fun onBiometric() {
        // BiometricPrompt integration — handled at Activity level
        // For now, mark as unlocked if biometric is enabled
        if (secureStorage.isBiometricEnabled()) {
            _uiState.update { it.copy(isUnlocked = true) }
        }
    }
}
