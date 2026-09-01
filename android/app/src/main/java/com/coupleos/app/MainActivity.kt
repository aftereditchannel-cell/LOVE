package com.coupleos.app

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.coupleos.app.security.biometric.BiometricHelper
import com.coupleos.app.security.biometric.LocalBiometricAvailable
import com.coupleos.app.security.biometric.LocalBiometricUnlock
import com.coupleos.app.ui.CoupleOSApp
import com.coupleos.app.ui.appearance.AppearancePrefs
import com.coupleos.app.ui.theme.CoupleOSTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    @Inject lateinit var appearancePrefs: AppearancePrefs

    override fun onCreate(savedInstanceState: Bundle?) {
        try {
            installSplashScreen()
        } catch (_: Throwable) {
            // Splash screen is cosmetic — never let it kill the launch.
        }
        try {
            setTheme(R.style.Theme_CoupleOS)
        } catch (_: Throwable) {
            // Theme is already AppCompat via the manifest/activity theme.
        }
        super.onCreate(savedInstanceState)
        try {
            enableEdgeToEdge()
        } catch (_: Throwable) {
        }

        val biometricHelper = try {
            BiometricHelper(this)
        } catch (_: Throwable) {
            null
        }
        val biometricAvailable = try {
            biometricHelper?.canAuthenticate() == true
        } catch (_: Throwable) {
            false
        }

        setContent {
            val look by appearancePrefs.state.collectAsState()
            CompositionLocalProvider(
                LocalLayoutDirection provides LayoutDirection.Rtl,
                LocalBiometricAvailable provides biometricAvailable,
                LocalBiometricUnlock provides { onOk, onErr ->
                    val helper = biometricHelper
                    if (helper == null) {
                        onErr("اثر انگشت آماده نیست")
                    } else {
                        helper.authenticate(onSuccess = onOk, onError = onErr)
                    }
                },
            ) {
                CoupleOSTheme(appearance = look) {
                    CoupleOSApp()
                }
            }
        }
    }
}
