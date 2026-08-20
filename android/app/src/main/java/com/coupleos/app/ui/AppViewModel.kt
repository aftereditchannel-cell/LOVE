package com.coupleos.app.ui

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.security.keystore.SecureStorage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class AppState {
    Loading,
    NeedSetup,
    NeedLock,
    Locked,
    Ready
}

@HiltViewModel
class AppViewModel @Inject constructor(
    private val secureStorage: SecureStorage
) : ViewModel() {

    private val _appState = MutableStateFlow(AppState.Loading)
    val appState: StateFlow<AppState> = _appState

    init {
        checkState()
    }

    private fun checkState() {
        viewModelScope.launch {
            delay(1500) // Splash display time

            try {
                val isPaired = secureStorage.isPaired()
                val isLockSetup = secureStorage.isLockSetupDone()

                Log.d("AppViewModel", "isPaired=$isPaired isLockSetup=$isLockSetup")

                _appState.value = when {
                    !isPaired -> AppState.NeedSetup
                    !isLockSetup -> AppState.NeedLock
                    else -> AppState.Locked
                }
            } catch (e: Exception) {
                // If secure storage crashes, reset and go to setup
                Log.e("AppViewModel", "SecureStorage error, resetting", e)
                try { secureStorage.clearAll() } catch (_: Exception) {}
                _appState.value = AppState.NeedSetup
            }
        }
    }

    fun onSetupComplete() {
        viewModelScope.launch {
            // Small delay to prevent race condition crash
            delay(300)
            _appState.value = AppState.NeedLock
        }
    }

    fun onLockSetupComplete() {
        viewModelScope.launch {
            delay(300)
            _appState.value = AppState.Ready
        }
    }

    fun onUnlocked() {
        _appState.value = AppState.Ready
    }

    fun lockApp() {
        _appState.value = AppState.Locked
    }
}
