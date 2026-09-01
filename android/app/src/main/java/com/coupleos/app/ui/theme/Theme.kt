package com.coupleos.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import com.coupleos.app.ui.appearance.AppearanceState

val LocalCouplePalette = staticCompositionLocalOf {
    couplePalette("rose-glass", 0xFFFF8AA0)
}

@Composable
fun CoupleOSTheme(
    appearance: AppearanceState = AppearanceState(),
    content: @Composable () -> Unit
) {
    val palette = couplePalette(appearance.theme, appearance.accent)
    val scheme = darkColorScheme(
        primary = palette.primary,
        onPrimary = Color(0xFFF0EDED),
        primaryContainer = palette.primaryContainer,
        onPrimaryContainer = palette.accent2,
        secondary = palette.muted,
        onSecondary = palette.text,
        background = palette.background,
        onBackground = palette.text,
        surface = palette.surface,
        onSurface = palette.text,
        surfaceVariant = palette.elevated,
        onSurfaceVariant = palette.muted,
        error = Danger,
        onError = palette.text,
        outline = DividerColor,
        outlineVariant = DividerColor,
    )
    CompositionLocalProvider(LocalCouplePalette provides palette) {
        MaterialTheme(
            colorScheme = scheme,
            typography = CoupleOSTypography,
            content = content,
        )
    }
}
