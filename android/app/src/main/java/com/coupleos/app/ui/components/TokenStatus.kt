package com.coupleos.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.coupleos.app.ui.theme.*

/**
 * Small banner used across every screen to tell the user whether the last action
 * was really registered on THEIR OWN token, or failed (with the error code).
 */
@Composable
fun TokenStatusBar(message: String?, modifier: Modifier = Modifier) {
    if (message.isNullOrBlank()) return
    val failed = message.contains("ثبت نشد") || message.contains("❌")
    val bg = if (failed) Color(0xFFFFE0E0) else Color(0xFFE3F8EC)
    val fg = if (failed) Color(0xFF8B1D2C) else Color(0xFF1B6B45)
    Box(
        modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp)
            .background(bg, RoundedCornerShape(12.dp))
            .padding(12.dp)
    ) {
        Text(message, color = fg, style = MaterialTheme.typography.bodySmall)
    }
}

/**
 * Header shown above data that came from the partner's token.
 * That data is view-only on this device.
 */
@Composable
fun PartnerReadOnlyHeader(title: String = "از توکن پارتنر (فقط خواندنی) 👁️", modifier: Modifier = Modifier) {
    Box(
        modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .background(Color(0xFFF1ECFF), RoundedCornerShape(12.dp))
            .padding(10.dp)
    ) {
        Text(title, color = Color(0xFF4A3A7A), style = MaterialTheme.typography.labelMedium)
    }
}
