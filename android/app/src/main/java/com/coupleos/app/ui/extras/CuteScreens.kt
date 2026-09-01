package com.coupleos.app.ui.extras

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.coupleos.app.ui.theme.*
import kotlinx.coroutines.delay

private val fortunes = listOf(
    "🌸 امروز یک بوس اضافه، حال هر دو را عوض می‌کند.",
    "🌙 شب، بدون موبایل، فقط شما دوتا.",
    "🍓 یک سورپرایز خوراکی کوچیک بساز.",
    "💌 یک جمله کوتاه بنویس و توی یخچال عشق بچسبون.",
    "🧸 حیوون دونفره‌تون گرسنه است — یه نوازش بده.",
)
private val compliments = listOf(
    "خنده‌ت قشنگ‌ترین چیز امروز بود.",
    "با تو دنیا نرم‌تره.",
    "امروزم عاشقتم، بدون دلیل اضافه.",
    "تو جای امن منی.",
    "یک پیام کوچیکت کل روزم رو قشنگ می‌کنه.",
)
private val pets = listOf("🐰" to "bunny", "🐱" to "kitten", "🐥" to "chick", "🐼" to "panda", "🧸" to "bear")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KissesScreen(vm: ExtraViewModel = hiltViewModel()) {
    val bundle by vm.extra.bundle.collectAsState()
    var meHolding by remember { mutableStateOf(false) }
    var partnerHolding by remember { mutableStateOf(false) }
    var burst by remember { mutableStateOf(false) }

    LaunchedEffect(meHolding, partnerHolding) {
        if (meHolding && partnerHolding) {
            burst = true
            vm.extra.sendKiss()
            delay(1000)
            burst = false
        }
    }

    Scaffold(containerColor = Color.Transparent, topBar = { TopAppBar(title = { Text("بوس‌شمار 💋", color = TextPrimary) }, colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)) }) { pad ->
        CuteBackground {
            Column(
                Modifier.fillMaxSize().padding(pad).padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                Spacer(Modifier.height(12.dp))
                Text(if (burst) "💖💋💕💗💋💖" else "💋", fontSize = 56.sp)
                Text("انگشتتون رو هم‌زمان روی قلب‌ها نگه دارید", color = TextSecondary)
                Text("بوس لمسی — مثل اپ Between", color = TextTertiary, style = MaterialTheme.typography.labelSmall)
                Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                    HoldHeart("من", meHolding) { meHolding = it }
                    HoldHeart("تو", partnerHolding) { partnerHolding = it }
                }
                if (burst) {
                    Text("بوسه گرفتین! 💋", color = Primary, style = MaterialTheme.typography.titleMedium)
                }
                Card(colors = CardDefaults.cardColors(containerColor = Surface.copy(alpha = 0.85f)), shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.padding(18.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${bundle.kissesSent}", color = Primary, style = MaterialTheme.typography.titleLarge)
                            Text("فرستادی", color = TextTertiary, style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${bundle.kissesReceived}", color = Primary, style = MaterialTheme.typography.titleLarge)
                            Text("گرفتی", color = TextTertiary, style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${bundle.kissesSent + bundle.kissesReceived}", color = Primary, style = MaterialTheme.typography.titleLarge)
                            Text("کل بوسه‌ها", color = TextTertiary, style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
                TextButton(onClick = { vm.extra.receiveKiss() }) { Text("بوس برگشتی رو شبیه‌سازی کن") }
            }
        }
    }
}

@Composable
private fun HoldHeart(label: String, active: Boolean, onHold: (Boolean) -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(130.dp)
                .clip(CircleShape)
                .background(if (active) Primary else SurfaceElevated)
                .pointerInput(Unit) {
                    detectTapGestures(
                        onPress = {
                            onHold(true)
                            try { tryAwaitRelease() } finally { onHold(false) }
                        }
                    )
                },
            contentAlignment = Alignment.Center,
        ) {
            Text(if (active) "💋" else "❤️", fontSize = 52.sp)
        }
        Spacer(Modifier.height(8.dp))
        Text(if (active) "نگه داشتی 💕" else label, color = if (active) Primary else TextSecondary)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PetScreen(vm: ExtraViewModel = hiltViewModel()) {
    val bundle by vm.extra.bundle.collectAsState()
    val p = bundle.pet
    val emoji = pets.firstOrNull { it.second == p.type }?.first ?: "🐰"
    Scaffold(containerColor = Background, topBar = { TopAppBar(title = { Text("حیوون دونفره ${p.name}", color = TextPrimary) }, colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)) }) { pad ->
        Column(Modifier.padding(pad).padding(20.dp).verticalScroll(rememberScrollState()), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(emoji, fontSize = 84.sp)
            Text(p.name, color = TextPrimary, style = MaterialTheme.typography.titleLarge)
            Text("گرسنگی ${p.hunger}", color = TextTertiary)
            LinearProgressIndicator(progress = p.hunger / 100f, modifier = Modifier.fillMaxWidth().height(8.dp), color = Primary, trackColor = SurfaceElevated)
            Text("عشق ${p.love}", color = TextTertiary)
            LinearProgressIndicator(progress = p.love / 100f, modifier = Modifier.fillMaxWidth().height(8.dp), color = Primary, trackColor = SurfaceElevated)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                Button(onClick = { vm.extra.feedPet() }, modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = Primary)) { Text("🍓 غذا") }
                Button(onClick = { vm.extra.petPet() }, modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = PrimaryContainer, contentColor = Primary)) { Text("🤍 نوازش") }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                pets.forEach { (e, id) -> TextButton(onClick = { vm.extra.setPetType(id) }) { Text(e, fontSize = 24.sp) } }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JarScreen(vm: ExtraViewModel = hiltViewModel()) {
    var drawn by remember { mutableStateOf<String?>(null) }
    var show by remember { mutableStateOf(false) }
    val bundle by vm.extra.bundle.collectAsState()
    Scaffold(containerColor = Background, topBar = { TopAppBar(title = { Text("شیشه تعریف 🫙", color = TextPrimary) }, colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)) }, floatingActionButton = { FloatingActionButton(onClick = { show = true }, containerColor = Primary) { Text("+", color = OnPrimary) } }) { pad ->
        Column(Modifier.padding(pad).padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("🫙", fontSize = 72.sp)
            Button(onClick = {
                val pool = compliments + bundle.compliments.map { it.text }
                drawn = pool.random()
            }, colors = ButtonDefaults.buttonColors(containerColor = Primary), modifier = Modifier.fillMaxWidth()) { Text("تکون بده") }
            if (drawn != null) Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
                Text(drawn!!, Modifier.padding(16.dp), color = TextPrimary)
            }
        }
    }
    if (show) {
        var text by remember { mutableStateOf("") }
        AlertDialog(onDismissRequest = { show = false }, title = { Text("تعریف جدید") }, text = { OutlinedTextField(value = text, onValueChange = { text = it }, modifier = Modifier.fillMaxWidth()) }, confirmButton = { Button(onClick = { if (text.isNotBlank()) { vm.extra.addCompliment(text); show = false } }, colors = ButtonDefaults.buttonColors(containerColor = Primary)) { Text("بریز توی شیشه") } }, dismissButton = { TextButton(onClick = { show = false }) { Text("انصراف") } })
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FortuneScreen() {
    val f = remember { fortunes[java.time.LocalDate.now().dayOfYear % fortunes.size] }
    Scaffold(containerColor = Background, topBar = { TopAppBar(title = { Text("فال عشق 🥠", color = TextPrimary) }, colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)) }) { pad ->
        Column(Modifier.padding(pad).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("🥠", fontSize = 64.sp)
            Spacer(Modifier.height(12.dp))
            Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(24.dp)) {
                Text(f, Modifier.padding(20.dp), color = TextPrimary)
            }
        }
    }
}
