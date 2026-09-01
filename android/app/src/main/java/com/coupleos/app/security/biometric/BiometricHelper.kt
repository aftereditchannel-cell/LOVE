package com.coupleos.app.security.biometric

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity

class BiometricHelper(private val activity: FragmentActivity) {

    fun canAuthenticate(): Boolean {
        val manager = BiometricManager.from(activity)
        val strong = manager.canAuthenticate(BIOMETRIC_STRONG)
        val weak = manager.canAuthenticate(BIOMETRIC_WEAK)
        return strong == BiometricManager.BIOMETRIC_SUCCESS ||
            weak == BiometricManager.BIOMETRIC_SUCCESS
    }

    fun authenticate(
        onSuccess: () -> Unit,
        onError: (String) -> Unit,
        onCancel: () -> Unit = {},
    ) {
        if (!canAuthenticate()) {
            onError("اثر انگشت روی این دستگاه در دسترس نیست")
            return
        }
        val executor = ContextCompat.getMainExecutor(activity)
        val prompt = BiometricPrompt(
            activity,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    onSuccess()
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    when (errorCode) {
                        BiometricPrompt.ERROR_NEGATIVE_BUTTON,
                        BiometricPrompt.ERROR_USER_CANCELED,
                        BiometricPrompt.ERROR_CANCELED -> onCancel()
                        else -> onError(errString.toString())
                    }
                }

                override fun onAuthenticationFailed() {
                    onError("اثر انگشت مطابقت نداشت")
                }
            }
        )
        val authenticators =
            if (BiometricManager.from(activity).canAuthenticate(BIOMETRIC_STRONG) == BiometricManager.BIOMETRIC_SUCCESS) {
                BIOMETRIC_STRONG
            } else {
                BIOMETRIC_WEAK
            }
        val info = BiometricPrompt.PromptInfo.Builder()
            .setTitle("ورود با اثر انگشت")
            .setSubtitle("دنیای کوچیک ما")
            .setNegativeButtonText("استفاده از PIN")
            .setAllowedAuthenticators(authenticators)
            .build()
        prompt.authenticate(info)
    }
}
