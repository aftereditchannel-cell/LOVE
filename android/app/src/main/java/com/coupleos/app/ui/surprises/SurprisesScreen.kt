package com.coupleos.app.ui.surprises

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
import com.coupleos.app.data.local.dao.SurpriseDao
import com.coupleos.app.data.local.entity.SurpriseEntity
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

@HiltViewModel
class SurprisesViewModel @Inject constructor(
    private val surpriseDao: SurpriseDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val syncRepository: CoupleSyncRepository,
) : ViewModel() {

    val surprises: StateFlow<List<SurpriseEntity>> = surpriseDao.getAllSurprises()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _feedback = MutableStateFlow<String?>(null)
    val feedback: StateFlow<String?> = _feedback

    val myUserId: String get() = secureStorage.getUserId().orEmpty()

    fun add(title: String, content: String, triggerDate: String) {
        if (content.isBlank()) return
        viewModelScope.launch {
            surpriseDao.insert(
                SurpriseEntity(
                    id = cryptoManager.generateId(),
                    title = title.ifBlank { "یه سورپرایز 🎁" },
                    content = content.trim(),
                    triggerType = if (triggerDate.isBlank()) "MANUAL" else "DATE",
                    triggerValue = triggerDate.trim(),
                    isRevealed = false,
                    createdBy = myUserId,
                    recipientId = "PARTNER",
                    createdAt = LocalDateTime.now().toString(),
                    isSynced = false,
                )
            )
            val result = syncRepository.push()
            _feedback.value = if (result.ok) "سورپرایز ساخته و روی توکن ذخیره شد 🎁"
            else "ساخته شد (لوکال) — ${result.message}"
        }
    }

    fun reveal(surprise: SurpriseEntity) {
        viewModelScope.launch {
            surpriseDao.update(surprise.copy(isRevealed = true, isSynced = false))
            syncRepository.push()
        }
    }

    fun isUnlocked(surprise: SurpriseEntity): Boolean {
        if (surprise.triggerType != "DATE" || surprise.triggerValue.isBlank()) return true
        val date = runCatching { LocalDate.parse(surprise.triggerValue) }.getOrNull() ?: return true
        return !LocalDate.now().isBefore(date)
    }

    fun clearFeedback() { _feedback.value = null }
}

@Composable
fun SurprisesScreen(onBack: () -> Unit, viewModel: SurprisesViewModel = hiltViewModel()) {
    val surprises by viewModel.surprises.collectAsState()
    val feedback by viewModel.feedback.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showDialog by remember { mutableStateOf(false) }
    var revealing by remember { mutableStateOf<SurpriseEntity?>(null) }

    LaunchedEffect(feedback) {
        feedback?.let { snackbarHostState.showSnackbar(it); viewModel.clearFeedback() }
    }

    FeatureScaffold(
        title = "سورپرایزها",
        subtitle = "${surprises.count { !it.isRevealed }} سورپرایز باز نشده",
        onBack = onBack,
        snackbarHostState = snackbarHostState,
        onFabClick = { showDialog = true },
        fabIcon = { Icon(Icons.Default.Add, contentDescription = "سورپرایز جدید") },
    ) { padding ->
        if (surprises.isEmpty()) {
            Box(modifier = Modifier.padding(padding)) {
                EmptyState("🎁", "هنوز سورپرایزی نساختی", "یه چیز خاص برای پارتنرت مخفی کن")
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(surprises, key = { it.id }) { surprise ->
                    val unlocked = viewModel.isUnlocked(surprise)
                    CoupleCard(
                        onClick = {
                            if (unlocked) {
                                revealing = surprise
                                if (!surprise.isRevealed) viewModel.reveal(surprise)
                            }
                        }
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(if (unlocked) "🎁" else "🔒", style = MaterialTheme.typography.headlineSmall)
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(surprise.title, style = MaterialTheme.typography.titleSmall, color = TextPrimary)
                                Text(
                                    text = when {
                                        !unlocked -> "در ${surprise.triggerValue} باز می‌شود"
                                        surprise.isRevealed -> "باز شده"
                                        else -> "برای باز کردن لمس کن"
                                    },
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (unlocked) Primary else TextTertiary,
                                )
                                SyncBadge(surprise.isSynced)
                            }
                        }
                    }
                }
                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }

    revealing?.let { surprise ->
        AlertDialog(
            onDismissRequest = { revealing = null },
            containerColor = Surface,
            title = { Text("🎉 ${surprise.title}", color = TextPrimary) },
            text = { Text(surprise.content, color = TextSecondary) },
            confirmButton = { TextButton(onClick = { revealing = null }) { Text("عالی بود ❤️", color = Primary) } },
        )
    }

    if (showDialog) {
        var title by remember { mutableStateOf("") }
        var content by remember { mutableStateOf("") }
        var triggerDate by remember { mutableStateOf("") }

        CoupleDialog(
            title = "سورپرایز جدید",
            onDismiss = { showDialog = false },
            onConfirm = { viewModel.add(title, content, triggerDate); showDialog = false },
            confirmEnabled = content.isNotBlank(),
        ) {
            CoupleTextField(title, { title = it }, "عنوان", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(content, { content = it }, "محتوای سورپرایز", minLines = 4)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(triggerDate, { triggerDate = it }, "تاریخ باز شدن (خالی = همین حالا)", singleLine = true)
        }
    }
}
