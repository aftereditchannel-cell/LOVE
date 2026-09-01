package com.coupleos.app

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.fragment.app.FragmentActivity
import com.coupleos.app.security.biometric.BiometricHelper
import com.coupleos.app.security.biometric.LocalBiometricAvailable
import com.coupleos.app.security.biometric.LocalBiometricUnlock
import com.coupleos.app.ui.CoupleOSApp
import com.coupleos.app.ui.appearance.AppearancePrefs
import com.coupleos.app.ui.theme.CoupleOSTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : FragmentActivity() {

    @Inject lateinit var appearancePrefs: AppearancePrefs

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val biometricHelper = BiometricHelper(this)

        setContent {
            val look by appearancePrefs.state.collectAsState()
            CompositionLocalProvider(
                LocalLayoutDirection provides LayoutDirection.Rtl,
                LocalBiometricAvailable provides biometricHelper.canAuthenticate(),
                LocalBiometricUnlock provides { onOk, onErr ->
                    biometricHelper.authenticate(onSuccess = onOk, onError = onErr)
                },
            ) {
                CoupleOSTheme(appearance = look) {
                    CoupleOSApp()
                }
            }
        }
    }
}
