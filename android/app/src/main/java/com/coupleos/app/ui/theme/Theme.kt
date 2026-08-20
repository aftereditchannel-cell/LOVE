package com.coupleos.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val CoupleOSDarkColorScheme = darkColorScheme(
    primary = Primary,
    onPrimary = OnPrimary,
    primaryContainer = PrimaryContainer,
    onPrimaryContainer = PrimaryLight,
    secondary = TextSecondary,
    onSecondary = TextPrimary,
    background = Background,
    onBackground = TextPrimary,
    surface = Surface,
    onSurface = TextPrimary,
    surfaceVariant = SurfaceElevated,
    onSurfaceVariant = TextSecondary,
    error = Danger,
    onError = TextPrimary,
    outline = DividerColor,
    outlineVariant = DividerColor,
)

@Composable
fun CoupleOSTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = CoupleOSDarkColorScheme,
        typography = CoupleOSTypography,
        content = content,
    )
}
