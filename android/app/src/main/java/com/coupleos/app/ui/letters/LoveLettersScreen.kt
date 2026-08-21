package com.coupleos.app.ui.letters

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.LoveLetterDao
import com.coupleos.app.data.local.entity.LoveLetterEntity
import com.coupleos.app.data.repository.CoupleSyncRepository
import com.coupleos.app.security.crypto.CryptoManager
import com.coupleos.app.security.keystore.SecureStorage
import com.coupleos.app.ui.common.*
import com.coupleos.app.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalDateTime
import javax.inject.Inject

/**
 * Time-locked love letters. A letter can only be opened once its
 * `openOnDate` has arrived — enforced locally on both devices.
 */
@HiltViewModel
class LoveLettersViewModel @Inject constructor(
    private val loveLetterDao: LoveLetterDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val syncRepository: CoupleSyncRepository,
) : ViewModel() {

    val letters: StateFlow<List<LoveLetterEntity>> = loveLetterDao.getAllLetters()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _feedback = MutableStateFlow<String?>(null)
    val feedback: StateFlow<String?> = _feedback

    val myUserId: String get() = secureStorage.getUserId().orEmpty()
    val partnerName: String get() = secureStorage.getPartnerName()

    fun write(title: String, content: String, openOn: String) {
        if (content.isBlank()) return
        val date = runCatching { LocalDate.parse(openOn.trim()) }.getOrNull()
        if (date == null) {
            _feedback.value = "تاریخ باز شدن باید YYYY-MM-DD باشه"
            return
        }
        viewModelScope.launch {
            loveLetterDao.insert(
                LoveLetterEntity(
                    id = cryptoManager.generateId(),
                    title = title.ifBlank { "نامه‌ای برای تو" },
                    content = content.trim(),
                    openOnDate = date.toString(),
                    isOpened = false,
                    createdBy = myUserId,
                    recipientId = "PARTNER",
                    createdAt = LocalDateTime.now().toString(),
                    isSynced = false,
                )
            )
            val result = syncRepository.push()
            _feedback.value = if (result.ok) "نامه نوشته شد و روی توکن ذخیره شد 💌"
            else "نوشته شد (لوکال) — ${result.message}"
        }
    }

    fun open(letter: LoveLetterEntity) {
        viewModelScope.launch {
            loveLetterDao.update(letter.copy(isOpened = true, isSynced = false))
            syncRepository.push()
        }
    }

    fun canOpen(letter: LoveLetterEntity): Boolean {
        if (letter.openOnDate.isBlank()) return true
        val date = runCatching { LocalDate.parse(letter.openOnDate) }.getOrNull() ?: return true
        return !LocalDate.now().isBefore(date)
    }

    fun clearFeedback() { _feedback.value = null }
}

@Composable
fun LoveLettersScreen(onBack: () -> Unit, viewModel: LoveLettersViewModel = hiltViewModel()) {
    val letters by viewModel.letters.collectAsState()
    val feedback by viewModel.feedback.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showDialog by remember { mutableStateOf(false) }
    var reading by remember { mutableStateOf<LoveLetterEntity?>(null) }

    LaunchedEffect(feedback) {
        feedback?.let { snackbarHostState.showSnackbar(it); viewModel.clearFeedback() }
    }

    FeatureScaffold(
        title = "نامه‌های عاشقانه",
        subtitle = "${letters.size} نامه",
        onBack = onBack,
        snackbarHostState = snackbarHostState,
        onFabClick = { showDialog = true },
        fabIcon = { Icon(Icons.Default.Add, contentDescription = "نامه جدید") },
    ) { padding ->
        if (letters.isEmpty()) {
            Box(modifier = Modifier.padding(padding)) {
                EmptyState("💌", "هنوز نامه‌ای نوشته نشده", "یک نامه بنویس که در آینده باز بشه")
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(letters, key = { it.id }) { letter ->
                    val unlocked = viewModel.canOpen(letter)
                    CoupleCard(
                        onClick = {
                            if (unlocked) {
                                reading = letter
                                if (!letter.isOpened) viewModel.open(letter)
                            }
                        }
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(if (unlocked) "💌" else "🔒", style = MaterialTheme.typography.headlineSmall)
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(letter.title, style = MaterialTheme.typography.titleSmall, color = TextPrimary)
                                Text(
                                    text = if (unlocked) "برای خواندن لمس کن" else "در ${letter.openOnDate} باز می‌شود",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (unlocked) Primary else TextTertiary,
                                )
                                SyncBadge(letter.isSynced)
                            }
                            if (letter.isOpened) {
                                Text("خوانده شد", style = MaterialTheme.typography.labelSmall, color = Success)
                            }
                        }
                    }
                }
                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }

    reading?.let { letter ->
        AlertDialog(
            onDismissRequest = { reading = null },
            containerColor = Surface,
            title = { Text(letter.title, color = TextPrimary) },
            text = { Text(letter.content, color = TextSecondary) },
            confirmButton = {
                TextButton(onClick = { reading = null }) { Text("بستم ❤️", color = Primary) }
            },
        )
    }

    if (showDialog) {
        var title by remember { mutableStateOf("") }
        var content by remember { mutableStateOf("") }
        var openOn by remember { mutableStateOf(LocalDate.now().toString()) }

        CoupleDialog(
            title = "نامه‌ای برای ${viewModel.partnerName.ifBlank { "پارتنرم" }}",
            confirmText = "بفرست",
            onDismiss = { showDialog = false },
            onConfirm = { viewModel.write(title, content, openOn); showDialog = false },
            confirmEnabled = content.isNotBlank(),
        ) {
            CoupleTextField(title, { title = it }, "عنوان", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(content, { content = it }, "متن نامه", minLines = 5)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(openOn, { openOn = it }, "کی باز بشه؟ (YYYY-MM-DD)", singleLine = true)
            Spacer(modifier = Modifier.height(6.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                FilterChip(selected = false, onClick = { openOn = LocalDate.now().toString() }, label = { Text("همین حالا") })
                FilterChip(selected = false, onClick = { openOn = LocalDate.now().plusDays(30).toString() }, label = { Text("یک ماه بعد") })
                FilterChip(selected = false, onClick = { openOn = LocalDate.now().plusYears(1).toString() }, label = { Text("یک سال بعد") })
            }
        }
    }
}
