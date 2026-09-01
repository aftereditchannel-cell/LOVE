package com.coupleos.app.ui.extras

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
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
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import coil.compose.AsyncImage
import com.coupleos.app.data.local.ExtraStore
import com.coupleos.app.data.local.dao.MemoryDao
import com.coupleos.app.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
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
                val bg = when (n.color) { "lemon" -> 0xFFFFF1B8L; "mint" -> 0xFFC9F3DEL; "sky" -> 0xFFCDE8FFL; else -> 0xFFFFD6E0L }
                Card(colors = CardDefaults.cardColors(containerColor = androidx.compose.ui.graphics.Color(bg)), shape = RoundedCornerShape(16.dp)) {
                    Column(Modifier.padding(16.dp)) {
                        Text(n.text, color = androidx.compose.ui.graphics.Color(0xFF5A2433L))
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
    val context = LocalContext.current
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        if (uri != null) {
            try {
                context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            } catch (_: Throwable) {
                // Some providers don't support persistable permissions — the base64 copy still saves.
            }
            val data = downscaleToBase64(context, uri)
            vm.extra.addPhoto(uri.toString(), "عکس", data ?: "")
        }
    }
    Scaffold(containerColor = Background, topBar = { TopAppBar(title = { Text("عکس‌های ما 📸", color = TextPrimary) }, colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)) }, floatingActionButton = { FloatingActionButton(onClick = { picker.launch(arrayOf("image/*")) }, containerColor = Primary) { Icon(Icons.Default.Add, null, tint = OnPrimary) } }) { pad ->
        val photos = bundle.photos
        if (photos.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(pad), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("📸", fontSize = 48.sp)
                    Spacer(Modifier.height(8.dp))
                    Text("گالری خالیه — عکس اضافه کن ❤️", color = TextTertiary)
                    Spacer(Modifier.height(4.dp))
                    Text("عکس‌ها روی توکن گیت ذخیره میشن", color = TextTertiary, style = MaterialTheme.typography.labelSmall)
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
                    Box(
                        modifier = Modifier
                            .aspectRatio(1f)
                            .clip(RoundedCornerShape(16.dp))
                            .background(SurfaceElevated)
                    ) {
                        if (p.data.isNotBlank()) {
                            Base64Image(p.data, Modifier.fillMaxSize())
                        } else {
                            AsyncImage(model = p.src, contentDescription = p.title, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                        }
                        IconButton(
                            onClick = { vm.extra.removePhoto(p.id) },
                            modifier = Modifier.align(Alignment.TopEnd).size(28.dp).background(Color(0xAA000000), RoundedCornerShape(10.dp)),
                        ) {
                            Icon(Icons.Default.Delete, contentDescription = "حذف", tint = Color.White, modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Base64Image(data: String, modifier: Modifier) {
    var bmp by remember(data) { mutableStateOf<Bitmap?>(null) }
    LaunchedEffect(data) {
        bmp = withContext(Dispatchers.IO) {
            try {
                val clean = data.substringAfter("base64,")
                val bytes = Base64.decode(clean, Base64.NO_WRAP)
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            } catch (_: Throwable) {
                null
            }
        }
    }
    val image = bmp
    if (image != null) {
        Image(bitmap = image.asImageBitmap(), contentDescription = null, modifier = modifier, contentScale = ContentScale.Crop)
    } else {
        Box(modifier.background(SurfaceElevated))
    }
}

private fun downscaleToBase64(context: Context, uri: Uri, maxDim: Int = 640, quality: Int = 72): String? {
    return try {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        var sample = 1
        while (bounds.outWidth / sample > maxDim || bounds.outHeight / sample > maxDim) sample *= 2
        val opts = BitmapFactory.Options().apply { inSampleSize = sample }
        val bmp = context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, opts) } ?: return null
        val bos = java.io.ByteArrayOutputStream()
        bmp.compress(Bitmap.CompressFormat.JPEG, quality, bos)
        val b64 = Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP)
        if (!bmp.isRecycled) bmp.recycle()
        "data:image/jpeg;base64,$b64"
    } catch (_: Throwable) {
        null
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
