package com.coupleos.app.ui.extras

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import coil.compose.AsyncImage
import com.coupleos.app.data.local.ExtraStore
import com.coupleos.app.data.local.dao.MemoryDao
import com.coupleos.app.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class ExtraViewModel @Inject constructor(
    val extra: ExtraStore,
    val memoryDao: MemoryDao,
) : ViewModel()

private val dateIdeas = listOf(
    Triple("🕯️", "شام شمع و ستاره", "میز رو با شمع و گل بچینید، موبایل‌ها خاموش."),
    Triple("🎬", "شب فیلم دونفره", "پتو، پاپ‌کورن خونگی و فیلم مورد علاقه."),
    Triple("🧺", "پیک‌نیک غروب", "یک سبد کوچیک و تماشای غروب."),
    Triple("🍳", "آشپزی مشترک", "یک دستور جدید که هیچ‌کدوم بلد نیستید."),
    Triple("🌙", "ستاره بینی", "پتو پهن کنید و ستاره‌ها رو بشمارید."),
    Triple("💌", "نامه و صبحانه", "برای هم نامه بنویسید و با صبحانه باز کنید."),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DatePlannerScreen(vm: ExtraViewModel = hiltViewModel()) {
    val bundle by vm.extra.bundle.collectAsState()
    var show by remember { mutableStateOf(false) }
    val idea = remember { dateIdeas.random() }
    Scaffold(containerColor = Background, topBar = { TopAppBar(title = { Text("برنامه قرار 🍝", color = TextPrimary) }, colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)) }, floatingActionButton = { FloatingActionButton(onClick = { show = true }, containerColor = Primary) { Icon(Icons.Default.Add, null, tint = OnPrimary) } }) { pad ->
        Column(Modifier.fillMaxSize().padding(pad).verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(16.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("ایده امروز", color = TextTertiary, style = MaterialTheme.typography.labelSmall)
                    Text("${idea.first} ${idea.second}", color = TextPrimary, style = MaterialTheme.typography.titleMedium)
                    Text(idea.third, color = TextSecondary)
                    Button(onClick = { vm.extra.addDate(idea.second, idea.third, idea.first, "") }, colors = ButtonDefaults.buttonColors(containerColor = Primary), modifier = Modifier.fillMaxWidth()) { Text("افزودن به برنامه‌ها") }
                }
            }
            if (bundle.dates.isEmpty()) Text("قراری برنامه‌ریزی نشده", color = TextTertiary)
            bundle.dates.forEach { d ->
                Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text("${d.emoji} ${d.title}", color = TextPrimary)
                        Text(d.desc, color = TextSecondary, style = MaterialTheme.typography.bodySmall)
                        TextButton(onClick = { vm.extra.removeDate(d.id) }) { Text("حذف", color = Danger) }
                    }
                }
            }
        }
    }
    if (show) {
        var title by remember { mutableStateOf("") }
        var desc by remember { mutableStateOf("") }
        AlertDialog(onDismissRequest = { show = false }, title = { Text("قرار جدید") }, text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("عنوان") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = desc, onValueChange = { desc = it }, label = { Text("توضیح") }, modifier = Modifier.fillMaxWidth())
            }
        }, confirmButton = { Button(onClick = { if (title.isNotBlank()) { vm.extra.addDate(title, desc, "💕", ""); show = false } }, colors = ButtonDefaults.buttonColors(containerColor = Primary)) { Text("افزودن") } }, dismissButton = { TextButton(onClick = { show = false }) { Text("انصراف") } })
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoveNotesScreen(vm: ExtraViewModel = hiltViewModel()) {
    val bundle by vm.extra.bundle.collectAsState()
    var show by remember { mutableStateOf(false) }
    val colors = listOf("rose", "lemon", "mint", "sky")
    Scaffold(containerColor = Background, topBar = { TopAppBar(title = { Text("یخچال عشق 🧊", color = TextPrimary) }, colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)) }, floatingActionButton = { FloatingActionButton(onClick = { show = true }, containerColor = Primary) { Icon(Icons.Default.Add, null, tint = OnPrimary) } }) { pad ->
        if (bundle.notes.isEmpty()) Box(Modifier.fillMaxSize().padding(pad), contentAlignment = Alignment.Center) { Text("یخچال خالیه — یک نوت کیوت بچسبون", color = TextTertiary) }
        else LazyColumn(Modifier.padding(pad).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(bundle.notes, key = { it.id }) { n ->
                val bg = when (n.color) { "lemon" -> 0xFFFFF1B8; "mint" -> 0xFFC9F3DE; "sky" -> 0xFFCDE8FF; else -> 0xFFFFD6E0 }
                Card(colors = CardDefaults.cardColors(containerColor = androidx.compose.ui.graphics.Color(bg)), shape = RoundedCornerShape(16.dp)) {
                    Column(Modifier.padding(16.dp)) {
                        Text(n.text, color = androidx.compose.ui.graphics.Color(0xFF5A2433))
                        TextButton(onClick = { vm.extra.removeNote(n.id) }) { Text("حذف") }
                    }
                }
            }
        }
    }
    if (show) {
        var text by remember { mutableStateOf("") }
        AlertDialog(onDismissRequest = { show = false }, title = { Text("نوت چسبونکی") }, text = { OutlinedTextField(value = text, onValueChange = { text = it }, label = { Text("یه جمله کیوت") }, modifier = Modifier.fillMaxWidth()) }, confirmButton = { Button(onClick = { if (text.isNotBlank()) { vm.extra.addNote(text, colors.random()); show = false } }, colors = ButtonDefaults.buttonColors(containerColor = Primary)) { Text("بچسبون") } }, dismissButton = { TextButton(onClick = { show = false }) { Text("انصراف") } })
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HabitsScreen(vm: ExtraViewModel = hiltViewModel()) {
    val bundle by vm.extra.bundle.collectAsState()
    var show by remember { mutableStateOf(false) }
    Scaffold(containerColor = Background, topBar = { TopAppBar(title = { Text("عادت‌های دونفره 🔥", color = TextPrimary) }, colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)) }, floatingActionButton = { FloatingActionButton(onClick = { show = true }, containerColor = Primary) { Icon(Icons.Default.Add, null, tint = OnPrimary) } }) { pad ->
        LazyColumn(Modifier.padding(pad).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (bundle.habits.isEmpty()) item { Text("عادتی نیست", color = TextTertiary) }
            items(bundle.habits, key = { it.id }) { h ->
                Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(16.dp)) {
                    Row(Modifier.padding(16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column { Text("${h.emoji} ${h.title}", color = TextPrimary); Text("استریک ${h.streak} روز", color = TextTertiary, style = MaterialTheme.typography.labelSmall) }
                        Checkbox(checked = h.last == java.time.LocalDate.now().toString(), onCheckedChange = { vm.extra.tickHabit(h.id) })
                    }
                }
            }
        }
    }
    if (show) {
        var title by remember { mutableStateOf("") }
        AlertDialog(onDismissRequest = { show = false }, title = { Text("عادت جدید") }, text = { OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("عنوان") }, modifier = Modifier.fillMaxWidth()) }, confirmButton = { Button(onClick = { if (title.isNotBlank()) { vm.extra.addHabit(title, "💗"); show = false } }, colors = ButtonDefaults.buttonColors(containerColor = Primary)) { Text("افزودن") } }, dismissButton = { TextButton(onClick = { show = false }) { Text("انصراف") } })
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MusicScreen(vm: ExtraViewModel = hiltViewModel()) {
    val bundle by vm.extra.bundle.collectAsState()
    var show by remember { mutableStateOf(false) }
    Scaffold(containerColor = Background, topBar = { TopAppBar(title = { Text("آهنگ ما 🎵", color = TextPrimary) }, colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)) }, floatingActionButton = { FloatingActionButton(onClick = { show = true }, containerColor = Primary) { Icon(Icons.Default.Add, null, tint = OnPrimary) } }) { pad ->
        LazyColumn(Modifier.padding(pad).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (bundle.songs.isEmpty()) item { Text("پلی‌لیست خالیه", color = TextTertiary) }
            items(bundle.songs, key = { it.id }) { s ->
                Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(16.dp)) {
                    Row(Modifier.padding(16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column { Text("🎵 ${s.title}", color = TextPrimary); Text(s.artist, color = TextTertiary, style = MaterialTheme.typography.labelSmall) }
                        TextButton(onClick = { vm.extra.removeSong(s.id) }) { Text("حذف", color = Danger) }
                    }
                }
            }
        }
    }
    if (show) {
        var title by remember { mutableStateOf("") }
        var artist by remember { mutableStateOf("") }
        AlertDialog(onDismissRequest = { show = false }, title = { Text("آهنگ جدید") }, text = { Column { OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("عنوان") }, modifier = Modifier.fillMaxWidth()); OutlinedTextField(value = artist, onValueChange = { artist = it }, label = { Text("خواننده") }, modifier = Modifier.fillMaxWidth()) } }, confirmButton = { Button(onClick = { if (title.isNotBlank()) { vm.extra.addSong(title, artist, ""); show = false } }, colors = ButtonDefaults.buttonColors(containerColor = Primary)) { Text("افزودن") } }, dismissButton = { TextButton(onClick = { show = false }) { Text("انصراف") } })
    }
}

@Composable
fun GamesScreen(vm: ExtraViewModel = hiltViewModel()) {
    GameArcadeScreen(vm)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PhotosGalleryScreen(vm: ExtraViewModel = hiltViewModel()) {
    val bundle by vm.extra.bundle.collectAsState()
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri != null) vm.extra.addPhoto(uri.toString(), "عکس")
    }
    Scaffold(containerColor = Background, topBar = { TopAppBar(title = { Text("عکس‌های ما 📸", color = TextPrimary) }, colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)) }, floatingActionButton = { FloatingActionButton(onClick = { picker.launch("image/*") }, containerColor = Primary) { Icon(Icons.Default.Add, null, tint = OnPrimary) } }) { pad ->
        val photos = bundle.photos
        if (photos.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(pad), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("📸", fontSize = 48.sp)
                    Text("گالری خالیه — عکس اضافه کن یا از خاطرات ثبت کن", color = TextTertiary)
                }
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                modifier = Modifier.fillMaxSize().padding(pad).padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(photos, key = { it.id }) { p ->
                    AsyncImage(model = p.src, contentDescription = p.title, modifier = Modifier.aspectRatio(1f), contentScale = ContentScale.Crop)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OurStoryScreen(vm: ExtraViewModel = hiltViewModel()) {
    val memories by vm.memoryDao.getAllMemories().collectAsState(initial = emptyList())
    Scaffold(containerColor = Background, topBar = { TopAppBar(title = { Text("داستان ما 📖", color = TextPrimary) }, colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)) }) { pad ->
        LazyColumn(Modifier.padding(pad).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (memories.isEmpty()) item { Text("خط داستانی از خاطرات ساخته میشه — اول یک خاطره ثبت کن", color = TextTertiary) }
            items(memories.sortedBy { it.date }, key = { it.id }) { m ->
                Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(16.dp)) {
                    Column(Modifier.padding(16.dp)) {
                        Text(m.date, color = TextTertiary, style = MaterialTheme.typography.labelSmall)
                        Text(m.title, color = TextPrimary, style = MaterialTheme.typography.titleSmall)
                        if (m.description.isNotEmpty()) Text(m.description, color = TextSecondary)
                    }
                }
            }
        }
    }
}
