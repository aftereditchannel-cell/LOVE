package com.coupleos.app.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.dp
import com.coupleos.app.ui.appearance.AppearanceState

@Composable
fun Modifier.glass(
    appearance: AppearanceState,
    shape: Shape = RoundedCornerShape(appearance.radius.dp),
): Modifier {
    val alpha = (appearance.glass.coerceIn(8, 36) / 100f) + 0.06f
    return this
        .clip(shape)
        .background(Color.White.copy(alpha = alpha.coerceIn(0.06f, 0.22f)))
        .border(1.dp, Color.White.copy(alpha = 0.16f), shape)
}

fun couplePalette(theme: String, accent: Int): CouplePalette {
    val a = Color(accent)
    return when (theme) {
        "sakura" -> CouplePalette(
            background = Color(0xFF1A0D14),
            surface = Color(0xFF2A1220),
            elevated = Color(0xFF341828),
            primary = a,
            primaryContainer = Color(0xFF3A1A28),
            text = Color(0xFFFFF0F6),
            muted = Color(0xFFE4B8CC),
            accent2 = Color(0xFFFFD3E8),
        )
        "lavender" -> CouplePalette(
            background = Color(0xFF120816),
            surface = Color(0xFF1C1028),
            elevated = Color(0xFF261436),
            primary = a,
            primaryContainer = Color(0xFF2A1840),
            text = Color(0xFFF6F0FF),
            muted = Color(0xFFCBBDE4),
            accent2 = Color(0xFF8EC5FF),
        )
        "ocean" -> CouplePalette(
            background = Color(0xFF071018),
            surface = Color(0xFF0C1C28),
            elevated = Color(0xFF122838),
            primary = a,
            primaryContainer = Color(0xFF123040),
            text = Color(0xFFEEF8FF),
            muted = Color(0xFFA9C6D6),
            accent2 = Color(0xFF9B8CFF),
        )
        "cream" -> CouplePalette(
            background = Color(0xFF1A140E),
            surface = Color(0xFF261C14),
            elevated = Color(0xFF322418),
            primary = a,
            primaryContainer = Color(0xFF3A2A18),
            text = Color(0xFFFFF6EA),
            muted = Color(0xFFE0C8AE),
            accent2 = Color(0xFFF3C98B),
        )
        "night" -> CouplePalette(
            background = Color(0xFF07070C),
            surface = Color(0xFF12121C),
            elevated = Color(0xFF1A1A28),
            primary = a,
            primaryContainer = Color(0xFF241828),
            text = Color(0xFFF4F1FF),
            muted = Color(0xFFC5C0D8),
            accent2 = Color(0xFF9AD7FF),
        )
        else -> CouplePalette(
            background = Color(0xFF14080E),
            surface = Color(0xFF1D0C14),
            elevated = Color(0xFF2A121C),
            primary = a,
            primaryContainer = Color(0xFF2D1A1C),
            text = Color(0xFFFFF4F6),
            muted = Color(0xFFD7B8C0),
            accent2 = Color(0xFFC9A0FF),
        )
    }
}

data class CouplePalette(
    val background: Color,
    val surface: Color,
    val elevated: Color,
    val primary: Color,
    val primaryContainer: Color,
    val text: Color,
    val muted: Color,
    val accent2: Color,
)

val meshBrush = Brush.verticalGradient(
    listOf(Color(0x33FF8AA0), Color.Transparent, Color(0x229B8CFF))
)
