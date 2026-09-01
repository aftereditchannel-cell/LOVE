package com.coupleos.app.security.biometric

import androidx.compose.runtime.staticCompositionLocalOf

val LocalBiometricAvailable = staticCompositionLocalOf { false }

val LocalBiometricUnlock = staticCompositionLocalOf<((() -> Unit, (String) -> Unit) -> Unit)> {
    { _, onError -> onError("اثر انگشت آماده نیست") }
}
