package com.coupleos.app.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.repository.CoupleSyncRepository
import com.coupleos.app.data.repository.DiagnosticLine
import com.coupleos.app.data.repository.GitHubRepository
import com.coupleos.app.security.keystore.SecureStorage
import com.coupleos.app.ui.common.*
import com.coupleos.app.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SettingsUiState(
    val myUsername: String? = null,
    val partnerUsername: String? = null,
    val maskedPersonalToken: String = "",
    val maskedPartnerToken: String = "",
    val myGistId: String? = null,
    val partnerGistId: String? = null,
    val lastSyncAt: String? = null,
    val lastSyncError: String? = null,
    val autoSync: Boolean = true,
    val personAName: String = "",
    val personBName: String = "",
    val isBusy: Boolean = false,
    val diagnostics: List<DiagnosticLine> = emptyList(),
    val message: String? = null,
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val secureStorage: SecureStorage,
    private val gitHubRepository: GitHubRepository,
    private val syncRepository: CoupleSyncRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState

    init { reload() }

    fun reload() {
        _uiState.update {
            it.copy(
                myUsername = secureStorage.getMyGitHubUsername(),
                partnerUsername = secureStorage.getPartnerGitHubUsername(),
                maskedPersonalToken = secureStorage.getMaskedPersonalToken(),
                maskedPartnerToken = secureStorage.getMaskedPartnerToken(),
                myGistId = secureStorage.getMyGistId(),
                partnerGistId = secureStorage.getPartnerGistId(),
                lastSyncAt = secureStorage.getLastSyncAt(),
                lastSyncError = secureStorage.getLastSyncError(),
                autoSync = secureStorage.isAutoSyncEnabled(),
                personAName = secureStorage.getPersonAName(),
                personBName = secureStorage.getPersonBName(),
            )
        }
    }

    fun setAutoSync(enabled: Boolean) {
        secureStorage.setAutoSyncEnabled(enabled)
        _uiState.update { it.copy(autoSync = enabled) }
    }

    fun saveNames(a: String, b: String) {
        if (a.isNotBlank()) secureStorage.savePersonAName(a.trim())
        if (b.isNotBlank()) secureStorage.savePersonBName(b.trim())
        reload()
        _uiState.update { it.copy(message = "اسم‌ها ذخیره شد") }
    }

    fun pushNow() = launchAction("در حال ارسال به توکن…") { syncRepository.push().message }

    fun pullNow() = launchAction("در حال دریافت از توکن…") { syncRepository.pull().message }

    fun fullSync() = launchAction("در حال همگام‌سازی…") { syncRepository.sync().message }

    fun runDiagnostics() {
        viewModelScope.launch {
            _uiState.update { it.copy(isBusy = true, diagnostics = emptyList(), message = "در حال تست کامل…") }
            val lines = gitHubRepository.runDiagnostics()
            _uiState.update { it.copy(isBusy = false, diagnostics = lines, message = null) }
            reload()
        }
    }

    private fun launchAction(busyMessage: String, block: suspend () -> String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isBusy = true, message = busyMessage) }
            val result = runCatching { block() }
            _uiState.update {
                it.copy(
                    isBusy = false,
                    message = result.getOrElse { e -> "خطا: ${e.localizedMessage}" },
                )
            }
            reload()
        }
    }

    fun unpair() {
        secureStorage.clearAll()
        _uiState.update { it.copy(message = "اتصال قطع شد — اپ رو دوباره باز کن") }
    }

    fun clearMessage() { _uiState.update { it.copy(message = null) } }
}

@Composable
fun SettingsScreen(onBack: () -> Unit, viewModel: SettingsViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showNames by remember { mutableStateOf(false) }
    var showUnpair by remember { mutableStateOf(false) }

    LaunchedEffect(state.message) {
        state.message?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearMessage()
        }
    }

    FeatureScaffold(
        title = "تنظیمات",
        subtitle = state.lastSyncAt?.let { "آخرین همگام‌سازی: ${it.take(16).replace('T', ' ')}" }
            ?: "هنوز همگام‌سازی نشده",
        onBack = onBack,
        snackbarHostState = snackbarHostState,
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
        ) {
            // ── Connection ────────────────────────────────
            Text("اتصال و توکن‌ها", style = MaterialTheme.typography.labelMedium, color = TextTertiary)
            Spacer(modifier = Modifier.height(8.dp))
            CoupleCard {
                InfoRow("گیت‌هاب من", state.myUsername ?: "نامشخص")
                InfoRow("توکن من", state.maskedPersonalToken.ifBlank { "ذخیره نشده" })
                InfoRow("Gist من", state.myGistId ?: "هنوز ساخته نشده")
                HorizontalDivider(color = DividerColor, thickness = 0.5.dp, modifier = Modifier.padding(vertical = 8.dp))
                InfoRow("گیت‌هاب پارتنر", state.partnerUsername ?: "نامشخص")
                InfoRow("توکن پارتنر", state.maskedPartnerToken.ifBlank { "ذخیره نشده" })
                InfoRow("Gist پارتنر", state.partnerGistId ?: "هنوز خوانده نشده")
                if (!state.lastSyncError.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("آخرین خطا: ${state.lastSyncError}", color = Danger, style = MaterialTheme.typography.bodySmall)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── Sync actions ──────────────────────────────
            Text("همگام‌سازی داده", style = MaterialTheme.typography.labelMedium, color = TextTertiary)
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = { viewModel.fullSync() },
                enabled = !state.isBusy,
                colors = ButtonDefaults.buttonColors(containerColor = Primary, contentColor = OnPrimary),
                modifier = Modifier.fillMaxWidth(),
            ) { Text(if (state.isBusy) "لطفاً صبر کن…" else "همگام‌سازی کامل (دریافت + ارسال)") }

            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = { viewModel.pushNow() },
                    enabled = !state.isBusy,
                    modifier = Modifier.weight(1f),
                ) { Text("ارسال به توکن", color = Primary) }
                OutlinedButton(
                    onClick = { viewModel.pullNow() },
                    enabled = !state.isBusy,
                    modifier = Modifier.weight(1f),
                ) { Text("دریافت از توکن", color = Primary) }
            }

            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Switch(
                    checked = state.autoSync,
                    onCheckedChange = { viewModel.setAutoSync(it) },
                    colors = SwitchDefaults.colors(checkedThumbColor = Primary, checkedTrackColor = PrimaryContainer),
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("همگام‌سازی خودکار بعد از هر تغییر", color = TextSecondary, style = MaterialTheme.typography.bodyMedium)
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── Diagnostics ───────────────────────────────
            Text("عیب‌یابی اتصال", style = MaterialTheme.typography.labelMedium, color = TextTertiary)
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedButton(
                onClick = { viewModel.runDiagnostics() },
                enabled = !state.isBusy,
                modifier = Modifier.fillMaxWidth(),
            ) { Text("تست کامل ذخیره‌سازی روی توکن", color = Primary) }

            if (state.diagnostics.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                CoupleCard {
                    state.diagnostics.forEach { line ->
                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
                            Text(if (line.ok) "✅" else "❌")
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(line.label, color = TextPrimary, style = MaterialTheme.typography.bodyMedium)
                                if (line.detail.isNotBlank()) {
                                    Text(line.detail, color = TextTertiary, style = MaterialTheme.typography.labelSmall)
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── Profile names ─────────────────────────────
            Text("اسم‌ها", style = MaterialTheme.typography.labelMedium, color = TextTertiary)
            Spacer(modifier = Modifier.height(8.dp))
            CoupleCard(onClick = { showNames = true }) {
                InfoRow("نفر اول", state.personAName)
                InfoRow("نفر دوم", state.personBName)
                Text("برای ویرایش لمس کن", color = Primary, style = MaterialTheme.typography.labelSmall)
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── Danger zone ───────────────────────────────
            Text("منطقه خطر", style = MaterialTheme.typography.labelMedium, color = Danger)
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedButton(
                onClick = { showUnpair = true },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("قطع اتصال و پاک کردن توکن‌ها", color = Danger) }

            Spacer(modifier = Modifier.height(80.dp))
        }
    }

    if (showNames) {
        var a by remember { mutableStateOf(state.personAName) }
        var b by remember { mutableStateOf(state.personBName) }
        CoupleDialog(
            title = "اسم‌ها",
            onDismiss = { showNames = false },
            onConfirm = { viewModel.saveNames(a, b); showNames = false },
        ) {
            CoupleTextField(a, { a = it }, "نفر اول", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(b, { b = it }, "نفر دوم", singleLine = true)
        }
    }

    if (showUnpair) {
        AlertDialog(
            onDismissRequest = { showUnpair = false },
            containerColor = Surface,
            title = { Text("مطمئنی؟", color = TextPrimary) },
            text = {
                Text(
                    "توکن‌ها و تنظیمات از این دستگاه پاک می‌شن. داده‌هایی که روی Gist ذخیره شدن باقی می‌مونن.",
                    color = TextSecondary,
                )
            },
            confirmButton = {
                TextButton(onClick = { viewModel.unpair(); showUnpair = false }) {
                    Text("بله، قطع کن", color = Danger)
                }
            },
            dismissButton = {
                TextButton(onClick = { showUnpair = false }) { Text("انصراف", color = TextSecondary) }
            },
        )
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = TextTertiary)
        Text(value, style = MaterialTheme.typography.bodySmall, color = TextPrimary)
    }
}
