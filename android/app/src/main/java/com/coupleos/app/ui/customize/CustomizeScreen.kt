package com.coupleos.app.ui.customize

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import com.coupleos.app.ui.appearance.AppearancePrefs
import com.coupleos.app.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class CustomizeViewModel @Inject constructor(val prefs: AppearancePrefs) : ViewModel()

private val themes = listOf(
    "rose-glass" to "🌹 رز شیشه‌ای",
    "sakura" to "🌸 ساکورا",
    "lavender" to "💜 اسطوخودوس",
    "ocean" to "🌊 اقیانوس",
    "cream" to "🍯 کرم عسلی",
    "night" to "✨ شب ستاره‌ای",
)
private val accents = listOf(0xFFFF8AA0, 0xFFFF7EB3, 0xFFC9A0FF, 0xFF7FD4FF, 0xFFE8A87C, 0xFFF0C4DE, 0xFF8FD9A4, 0xFFFFD36E)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomizeScreen(onBack: () -> Unit = {}, vm: CustomizeViewModel = hiltViewModel()) {
    val look by vm.prefs.state.collectAsState()
    var title by remember(look.coupleTitle) { mutableStateOf(look.coupleTitle) }
    Scaffold(
        containerColor = Background,
        topBar = {
            TopAppBar(
                title = { Text("کاستوم‌سازی 🎨", color = TextPrimary) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface),
                navigationIcon = { TextButton(onClick = onBack) { Text("بازگشت", color = Primary) } },
            )
        }
    ) { pad ->
        Column(
            Modifier.fillMaxSize().padding(pad).verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("تم", color = TextTertiary, style = MaterialTheme.typography.labelMedium)
            themes.chunked(2).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    row.forEach { (id, label) ->
                        val on = look.theme == id
                        Box(
                            Modifier.weight(1f).clip(RoundedCornerShape(16.dp))
                                .background(if (on) PrimaryContainer else Surface)
                                .border(1.dp, if (on) Primary else DividerColor, RoundedCornerShape(16.dp))
                                .clickable { vm.prefs.patch { it.copy(theme = id, accent = when (id) {
                                    "sakura" -> 0xFFFF7EB3; "lavender" -> 0xFFC9A0FF; "ocean" -> 0xFF7FD4FF
                                    "cream" -> 0xFFE8A87C; "night" -> 0xFFF0C4DE; else -> 0xFFFF8AA0
                                }) } }
                                .padding(12.dp),
                            contentAlignment = Alignment.Center,
                        ) { Text(label, color = TextPrimary) }
                    }
                }
            }
            Text("رنگ اکسنت", color = TextTertiary, style = MaterialTheme.typography.labelMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                accents.forEach { c ->
                    Box(
                        Modifier.size(32.dp).clip(CircleShape).background(Color(c))
                            .border(2.dp, if (look.accent == c) Color.White else Color.Transparent, CircleShape)
                            .clickable { vm.prefs.patch { it.copy(accent = c) } }
                    )
                }
            }
            Text("شیشه ${look.glass}px", color = TextSecondary)
            Slider(value = look.glass.toFloat(), onValueChange = { v -> vm.prefs.patch { it.copy(glass = v.toInt()) } }, valueRange = 8f..36f, colors = SliderDefaults.colors(thumbColor = Primary, activeTrackColor = Primary))
            Text("گردی گوشه‌ها ${look.radius}px", color = TextSecondary)
            Slider(value = look.radius.toFloat(), onValueChange = { v -> vm.prefs.patch { it.copy(radius = v.toInt()) } }, valueRange = 10f..32f, colors = SliderDefaults.colors(thumbColor = Primary, activeTrackColor = Primary))
            Text("اندازه نوشته ${"%.2f".format(look.fontScale)}", color = TextSecondary)
            Slider(value = look.fontScale, onValueChange = { v -> vm.prefs.patch { it.copy(fontScale = v) } }, valueRange = 0.9f..1.2f, colors = SliderDefaults.colors(thumbColor = Primary, activeTrackColor = Primary))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("قلب‌های شناور", color = TextPrimary)
                Switch(checked = look.particles, onCheckedChange = { v -> vm.prefs.patch { it.copy(particles = v) } })
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("استیکر کیوت", color = TextPrimary)
                Switch(checked = look.cuteStickers, onCheckedChange = { v -> vm.prefs.patch { it.copy(cuteStickers = v) } })
            }
            OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("عنوان اپ") }, modifier = Modifier.fillMaxWidth())
            Button(onClick = { vm.prefs.patch { it.copy(coupleTitle = title.ifBlank { "دنیای کوچیک ما" }) } }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Primary)) {
                Text("ذخیره عنوان")
            }
            Spacer(Modifier.height(40.dp))
        }
    }
}
