package com.coupleos.app.ui.theme

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.random.Random

/**
 * Soft dreamy rose→plum gradient used behind cute screens.
 */
val CuteGradient = Brush.verticalGradient(
    listOf(
        Color(0xFF3A1020),
        Color(0xFF200A16),
        Color(0xFF180B22),
    )
)

/**
 * A full-screen cute backdrop with drifting hearts, plus the given content on top.
 */
@Composable
fun CuteBackground(content: @Composable BoxScope.() -> Unit) {
    Box(modifier = Modifier.fillMaxSize().background(CuteGradient)) {
        FloatingHearts()
        content()
    }
}

private data class HeartSpec(
    val emoji: String,
    val x: Float,
    val size: Float,
    val duration: Int,
    val delay: Int,
)

@Composable
fun FloatingHearts(count: Int = 10) {
    val emojis = listOf("💗", "💕", "🌸", "💖", "🩷", "✨", "💘")
    val specs = remember {
        List(count) {
            HeartSpec(
                emoji = emojis[Random.nextInt(emojis.size)],
                x = Random.nextFloat(),
                size = (14 + Random.nextInt(22)).toFloat(),
                duration = 6000 + Random.nextInt(6000),
                delay = Random.nextInt(5000),
            )
        }
    }
    Box(Modifier.fillMaxSize()) {
        specs.forEach { spec -> FloatingHeart(spec) }
    }
}

@Composable
private fun FloatingHeart(spec: HeartSpec) {
    val density = LocalDensity.current
    val transition = rememberInfiniteTransition(label = "heart_${spec.emoji}_${spec.x}")
    val progress by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = spec.duration, delayMillis = spec.delay, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "heart_progress",
    )
    val travelPx = with(density) { 1000.dp.toPx() }
    val xPx = with(density) { (360.dp * spec.x).toPx() }
    val yPx = travelPx * (1f - progress) - with(density) { 220.dp.toPx() }
    val alpha = ((1f - progress) * 0.85f).coerceIn(0f, 0.85f)
    Text(
        text = spec.emoji,
        fontSize = spec.size.sp,
        modifier = Modifier
            .offset { IntOffset(xPx.toInt(), yPx.toInt()) }
            .alpha(alpha),
    )
}
