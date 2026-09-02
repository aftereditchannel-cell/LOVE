@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.coupleos.app.ui.extras

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.coupleos.app.data.local.ExtraStore
import com.coupleos.app.ui.components.TokenStatusBar
import com.coupleos.app.ui.theme.*
import kotlinx.coroutines.delay

private enum class Arcade { Hub, Memory, Catch, Ttt, Rps, Quiz, Truth }

private val rpsChoices = listOf(Triple("flower", "🌸", "گل"), Triple("teddy", "🧸", "تدی"), Triple("bow", "🎀", "پاپیون"))
private val knowMe = listOf(
    "صبحونه مورد علاقه‌ش چیه؟" to listOf("نان و پنیر و چای", "کرپ و توت‌فرنگی", "هرچی تو بپزی"),
    "اگر بارون بیاد چیکار می‌کنه؟" to listOf("چای و فیلم", "پیاده‌روی خیس", "عکس از قطره‌ها"),
    "کادوی رویایی‌ش چیه؟" to listOf("نامه دست‌نویس", "گل غیرمنتظره", "سفر غافلگیرکننده"),
    "رنگ حال‌خوب‌کن‌ش؟" to listOf("صورتی پاستلی", "یاسی", "کرم عسلی"),
    "قرار ایده‌آل؟" to listOf("شام شمع", "پیک‌نیک غروب", "اسپا خونگی"),
    "چی بیشتر لوس‌ش می‌کنه؟" to listOf("یک بوس الکی", "صدازدن با اسم کیوت", "بغل طولانی"),
)
private val truths = listOf(
    "اولین چیزی که از پارتنرت عاشقش شدی چی بود؟",
    "یک عادت کوچیکش که دلت براش ضعف میره؟",
    "اگر یک روز جاتون عوض می‌شد چیکار می‌کردی؟",
    "یک ترس کوچیک که هنوز بهش نگفتی؟",
    "کدوم خاطره‌تون باید فیلم بشه؟",
)
private val rathers = listOf(
    "سفر جاده‌ای شبانه" to "هتل پنج ستاره ساحلی",
    "نامه دست‌نویس هر هفته" to "سورپرایز ناگهانی",
    "باران و چای" to "آفتاب و بستنی",
    "فیلم عاشقانه" to "بازی دونفره",
    "صبح زود با هم" to "شب دیر با هم",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GameArcadeScreen(vm: ExtraViewModel = hiltViewModel()) {
    val bundle by vm.extra.bundle.collectAsState()
    val partner by vm.extra.partnerBundle.collectAsState()
    val status by vm.extra.syncStatus.collectAsState()
    var tab by remember { mutableStateOf(Arcade.Hub) }
    val title = when (tab) {
        Arcade.Hub -> "اتاق بازی 🎮"
        Arcade.Memory -> "حافظه قلب‌ها 🧸"
        Arcade.Catch -> "باران قلب 💗"
        Arcade.Ttt -> "دوز عاشقانه 🌸"
        Arcade.Rps -> "گل و تدی 🎀"
        Arcade.Quiz -> "چقدر منو می‌شناسی 💌"
        Arcade.Truth -> "حقیقت نرم 🌙"
    }
    Scaffold(
        containerColor = Background,
        topBar = {
            TopAppBar(
                title = { Text(title, color = TextPrimary) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface),
                navigationIcon = {
                    if (tab != Arcade.Hub) TextButton(onClick = { tab = Arcade.Hub }) { Text("‹", color = Primary, fontSize = 22.sp) }
                },
            )
        },
    ) { pad ->
        when (tab) {
            Arcade.Hub -> HubPane(bundle.play, partner.play, status, vm.extra, { tab = it }, Modifier.padding(pad))
            Arcade.Memory -> MemoryPane(vm.extra, Modifier.padding(pad))
            Arcade.Catch -> CatchPane(vm.extra, Modifier.padding(pad))
            Arcade.Ttt -> TttPane(vm.extra, Modifier.padding(pad))
            Arcade.Rps -> RpsPane(vm.extra, Modifier.padding(pad))
            Arcade.Quiz -> QuizPane(vm.extra, Modifier.padding(pad))
            Arcade.Truth -> TruthPane(vm.extra, Modifier.padding(pad))
        }
    }
}

@Composable
private fun HubPane(
    play: com.coupleos.app.data.local.GamePlay,
    partnerPlay: com.coupleos.app.data.local.GamePlay,
    status: String?,
    extra: ExtraStore,
    go: (Arcade) -> Unit,
    modifier: Modifier,
) {
    var code by remember { mutableStateOf("") }
    var toast by remember { mutableStateOf("") }
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        TokenStatusBar(status)
        Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("امتیاز دونفره", color = TextTertiary, style = MaterialTheme.typography.labelSmall)
                Text("💗 ${play.tttMe} — ${play.tttPartner} 🌸", color = TextPrimary, style = MaterialTheme.typography.titleMedium)
                Text("گل‌تدی ${play.rpsMe}:${play.rpsPartner} · رکورد قلب ${play.catchBest}", color = TextSecondary, style = MaterialTheme.typography.bodySmall)
                Text("رکورد پارتنر از توکن خودش 👁️ قلب ${partnerPlay.catchBest} · دوز ${partnerPlay.tttMe} · ${partnerPlay.plays} دور", color = TextTertiary, style = MaterialTheme.typography.labelSmall)
            }
        }
        Text("یه‌نفره — برای دل خودت", color = TextTertiary, style = MaterialTheme.typography.labelSmall)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            Tile("🧸", "حافظه قلب‌ها", "یه‌نفره", Modifier.weight(1f)) { go(Arcade.Memory) }
            Tile("💗", "باران قلب", "یه‌نفره", Modifier.weight(1f)) { go(Arcade.Catch) }
        }
        Text("دونفره آنلاین — نوبتی یا با کد", color = TextTertiary, style = MaterialTheme.typography.labelSmall)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            Tile("🌸", "دوز عاشقانه", "آنلاین", Modifier.weight(1f)) { go(Arcade.Ttt) }
            Tile("🎀", "گل و تدی", "آنلاین", Modifier.weight(1f)) { go(Arcade.Rps) }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            Tile("💌", "چقدر منو می‌شناسی", "آنلاین", Modifier.weight(1f)) { go(Arcade.Quiz) }
            Tile("🌙", "حقیقت نرم", "دونفره", Modifier.weight(1f)) { go(Arcade.Truth) }
        }
        Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("اتاق آنلاین", color = TextTertiary, style = MaterialTheme.typography.labelSmall)
                Text("کد بازی رو بفرست تا پارتنر همون صفحه رو ببینه.", color = TextSecondary, style = MaterialTheme.typography.bodySmall)
                OutlinedTextField(value = extra.exportPlayCode(), onValueChange = {}, readOnly = true, label = { Text("کد این اتاق") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = code, onValueChange = { code = it }, label = { Text("کد پارتنر را بچسبون") }, modifier = Modifier.fillMaxWidth())
                Button(
                    onClick = { toast = if (extra.importPlayCode(code)) "وارد اتاق شدی 🌸" else "کد بازی نامعتبر است" },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary),
                ) { Text("ورود به اتاق") }
                if (toast.isNotEmpty()) Text(toast, color = Primary)
            }
        }
        Text("${play.plays} دور بازی کردید", color = TextTertiary, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
    }
}

@Composable
private fun Tile(emoji: String, title: String, tag: String, modifier: Modifier, onClick: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(20.dp), modifier = modifier.clickable(onClick = onClick)) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(emoji, fontSize = 28.sp)
            Text(title, color = TextPrimary, style = MaterialTheme.typography.titleSmall)
            Text(tag, color = Primary, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun MemoryPane(extra: ExtraStore, modifier: Modifier) {
    val bundle by extra.bundle.collectAsState()
    val g = bundle.play
    LaunchedEffect(g.memLock) {
        if (g.memLock) {
            delay(700)
            extra.memoryUnflip()
        }
    }
    Column(modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(if (g.memWon) "همه جفت‌ها پیدا شد 💗" else if (g.memCards.isEmpty()) "۸ جفت قلب و گل و تدی" else "${g.memMoves} حرکت · ${g.memMatched}/۸ جفت", color = TextSecondary)
        if (g.memCards.isEmpty()) {
            Button(onClick = { extra.startMemory() }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Primary)) { Text("شروع") }
        } else {
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                for (row in 0 until 4) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        for (col in 0 until 4) {
                            val i = row * 4 + col
                            val c = g.memCards.getOrNull(i)
                            val open = c != null && (c.flipped || c.matched)
                            Button(
                                onClick = { extra.flipMemory(i) },
                                modifier = Modifier.weight(1f).aspectRatio(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = if (c?.matched == true) PrimaryContainer else Surface, contentColor = TextPrimary),
                                shape = RoundedCornerShape(16.dp),
                            ) { Text(if (open) (c?.emoji ?: "♡") else "♡", fontSize = 22.sp) }
                        }
                    }
                }
            }
            if (g.memWon) Text("آفرین گل 🌸 رکورد: ${g.memoryMovesBest} حرکت", color = Primary)
            Button(onClick = { extra.startMemory() }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = PrimaryContainer, contentColor = Primary)) { Text("دور جدید") }
        }
    }
}

@Composable
private fun CatchPane(extra: ExtraStore, modifier: Modifier) {
    val best = extra.bundle.collectAsState().value.play.catchBest
    var running by remember { mutableStateOf(false) }
    var left by remember { mutableStateOf(20) }
    var score by remember { mutableStateOf(0) }
    var x by remember { mutableStateOf(0.42f) }
    var y by remember { mutableStateOf(0.36f) }
    LaunchedEffect(running) {
        if (!running) return@LaunchedEffect
        left = 20
        score = 0
        while (left > 0 && running) {
            delay(1000)
            left -= 1
        }
        running = false
        extra.saveCatchScore(score)
    }
    Column(modifier.fillMaxSize().padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(if (running) "$left ثانیه" else "۲۰ ثانیه قلب بزن", color = TextSecondary)
        Text("امتیاز $score · بهترین $best", color = TextPrimary)
        Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(24.dp), modifier = Modifier.fillMaxWidth().height(260.dp)) {
            Box(Modifier.fillMaxSize()) {
                if (running) {
                    Text(
                        "💗",
                        fontSize = 42.sp,
                        modifier = Modifier
                            .padding(start = (x * 220).dp, top = (y * 180).dp)
                            .clickable {
                                score += 1
                                x = 0.08f + kotlin.random.Random.nextFloat() * 0.72f
                                y = 0.10f + kotlin.random.Random.nextFloat() * 0.62f
                            },
                    )
                } else {
                    Text("قلب‌ها از آسمون میان ✨", color = TextTertiary, modifier = Modifier.align(Alignment.Center))
                }
            }
        }
        if (!running) Button(onClick = { running = true }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Primary)) { Text("ببار قلب") }
    }
}

@Composable
private fun TttPane(extra: ExtraStore, modifier: Modifier) {
    val g = extra.bundle.collectAsState().value.play
    Column(modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        if (!g.tttStarted) {
            Text("تو 💗 هستی، پارتنر 🌸. نوبتی بازی کنید یا کد اتاق بفرستید.", color = TextSecondary)
            Button(onClick = { extra.startTtt("hotseat") }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Primary)) { Text("دونفره روی یک گوشی") }
            Button(onClick = { extra.startTtt("online") }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = PrimaryContainer, contentColor = Primary)) { Text("اتاق آنلاین (کد)") }
            Button(onClick = { extra.startTtt("cpu") }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = PrimaryContainer, contentColor = Primary)) { Text("یه‌نفره با دنیای کوچیک") }
        } else {
            val msg = when (g.tttWinner) {
                "draw" -> "مساوی شد 🤍"
                "me" -> "تو برنده 💗"
                "partner" -> "پارتنر برنده 🌸"
                else -> if (g.tttTurn == "me") "نوبت تو" else "نوبت پارتنر"
            }
            Text(msg, color = TextPrimary)
            Column(Modifier.width(280.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                for (row in 0..2) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        for (col in 0..2) {
                            val i = row * 3 + col
                            val v = g.tttBoard.getOrElse(i) { "" }
                            Button(
                                onClick = { extra.playTtt(i) },
                                modifier = Modifier.weight(1f).aspectRatio(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = Surface, contentColor = TextPrimary),
                                shape = RoundedCornerShape(20.dp),
                            ) { Text(if (v == "me") "💗" else if (v == "partner") "🌸" else "", fontSize = 28.sp) }
                        }
                    }
                }
            }
            Button(onClick = { extra.startTtt(g.tttMode) }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Primary)) { Text("دور جدید") }
        }
    }
}

@Composable
private fun RpsPane(extra: ExtraStore, modifier: Modifier) {
    val g = extra.bundle.collectAsState().value.play
    val res = when (g.rpsResult) {
        "" -> "هر کس پنهانی انتخاب کنه 🎀"
        "draw" -> "جفت‌تون قشنگ بود — مساوی 🤍"
        "me" -> "تو بردی 💗"
        else -> "پارتنر برد 🌸"
    }
    Column(modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(res, color = TextPrimary, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
        Text("انتخاب تو", color = TextTertiary)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            rpsChoices.forEach { (id, emoji, name) ->
                Button(
                    onClick = { extra.lockRps("me", id) },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = if (g.rpsMeChoice == id) PrimaryContainer else Surface, contentColor = TextPrimary),
                ) { Text("$emoji\n$name", textAlign = TextAlign.Center) }
            }
        }
        Text("انتخاب پارتنر", color = TextTertiary)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            rpsChoices.forEach { (id, emoji, name) ->
                Button(
                    onClick = { extra.lockRps("partner", id) },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = if (g.rpsPartnerChoice == id) PrimaryContainer else Surface, contentColor = TextPrimary),
                ) { Text("${if (g.rpsResult.isNotEmpty()) emoji else "❔"}\n$name", textAlign = TextAlign.Center) }
            }
        }
        Button(onClick = { extra.startRps() }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Primary)) { Text("دور جدید") }
    }
}

@Composable
private fun QuizPane(extra: ExtraStore, modifier: Modifier) {
    val g = extra.bundle.collectAsState().value.play
    val item = knowMe[g.quizIndex % knowMe.size]
    Column(modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("${g.quizMatches} جواب جفت", color = TextTertiary)
        Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text("سؤال ${g.quizIndex + 1}", color = TextTertiary, style = MaterialTheme.typography.labelSmall)
                Text(item.first, color = TextPrimary, style = MaterialTheme.typography.titleMedium)
            }
        }
        Text("جواب تو", color = TextTertiary)
        item.second.forEachIndexed { i, o ->
            Button(
                onClick = { extra.answerQuiz("me", i) },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = if (g.quizMy == i) PrimaryContainer else Surface, contentColor = if (g.quizMy == i) Primary else TextPrimary),
            ) { Text(o) }
        }
        Text("حدس پارتنر", color = TextTertiary)
        item.second.forEachIndexed { i, o ->
            Button(
                onClick = { extra.answerQuiz("partner", i) },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = if (g.quizPartner == i) PrimaryContainer else Surface, contentColor = TextPrimary),
            ) { Text(if (g.quizRevealed) o else "انتخاب پنهان") }
        }
        if (g.quizRevealed) Text(if (g.quizMy == g.quizPartner) "جفت شدین 💗 همینو دوست داره" else "این‌بار فرق داشت — بپرس چرا 🌸", color = Primary)
        Button(onClick = { extra.nextQuiz() }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Primary)) { Text("سؤال بعدی") }
    }
}

@Composable
private fun TruthPane(extra: ExtraStore, modifier: Modifier) {
    val plays = extra.bundle.collectAsState().value.play.plays
    val truth = truths[plays % truths.size]
    val rather = rathers[plays % rathers.size]
    Column(modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text("حقیقت", color = TextTertiary, style = MaterialTheme.typography.labelSmall)
                Text(truth, color = TextPrimary, style = MaterialTheme.typography.titleMedium)
            }
        }
        Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("کدوم رو ترجیح می‌دی؟", color = TextTertiary, style = MaterialTheme.typography.labelSmall)
                Button(onClick = { extra.bumpTruth() }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = PrimaryContainer, contentColor = Primary)) { Text(rather.first) }
                Button(onClick = { extra.bumpTruth() }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = PrimaryContainer, contentColor = Primary)) { Text(rather.second) }
            }
        }
        Button(onClick = { extra.bumpTruth() }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Primary)) { Text("سؤال بعدی") }
    }
}
