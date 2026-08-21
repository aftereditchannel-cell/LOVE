package com.coupleos.app.ui.relationship

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.RelationshipCheckinDao
import com.coupleos.app.data.local.entity.RelationshipCheckinEntity
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

data class CheckinUiState(
    val communication: Int = 5,
    val trust: Int = 5,
    val qualityTime: Int = 5,
    val affection: Int = 5,
    val funScore: Int = 5,
    val support: Int = 5,
    val isSaving: Boolean = false,
)

@HiltViewModel
class RelationshipViewModel @Inject constructor(
    private val checkinDao: RelationshipCheckinDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val syncRepository: CoupleSyncRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(CheckinUiState())
    val uiState: StateFlow<CheckinUiState> = _uiState

    private val _feedback = MutableStateFlow<String?>(null)
    val feedback: StateFlow<String?> = _feedback

    val checkins: StateFlow<List<RelationshipCheckinEntity>> = checkinDao.getAllCheckins()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val myUserId: String get() = secureStorage.getUserId().orEmpty()
    val partnerName: String get() = secureStorage.getPartnerName()

    init {
        viewModelScope.launch {
            val existing = checkinDao.getCheckin(myUserId, LocalDate.now().toString())
            if (existing != null) {
                _uiState.value = CheckinUiState(
                    existing.communication, existing.trust, existing.qualityTime,
                    existing.affection, existing.funScore, existing.support,
                )
            }
        }
    }

    fun update(transform: (CheckinUiState) -> CheckinUiState) { _uiState.update(transform) }

    fun save() {
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true) }
            val s = _uiState.value
            val today = LocalDate.now().toString()
            checkinDao.insert(
                RelationshipCheckinEntity(
                    id = "checkin-$myUserId-$today",
                    userId = myUserId,
                    communication = s.communication,
                    trust = s.trust,
                    qualityTime = s.qualityTime,
                    affection = s.affection,
                    funScore = s.funScore,
                    support = s.support,
                    date = today,
                    createdAt = LocalDateTime.now().toString(),
                    isSynced = false,
                )
            )
            val result = syncRepository.push()
            _uiState.update { it.copy(isSaving = false) }
            _feedback.value = if (result.ok) "ثبت شد و روی توکن ذخیره شد ✅"
            else "ثبت شد (لوکال) — ${result.message}"
        }
    }

    fun clearFeedback() { _feedback.value = null }
}

@Composable
fun RelationshipScreen(onBack: () -> Unit, viewModel: RelationshipViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsState()
    val checkins by viewModel.checkins.collectAsState()
    val feedback by viewModel.feedback.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(feedback) {
        feedback?.let { snackbarHostState.showSnackbar(it); viewModel.clearFeedback() }
    }

    val average = (state.communication + state.trust + state.qualityTime +
        state.affection + state.funScore + state.support) / 6.0

    val partnerLatest = checkins.firstOrNull { it.userId != viewModel.myUserId }

    FeatureScaffold(
        title = "رابطه ما",
        subtitle = "میانگین امروز: ${"%.1f".format(average)} از ۱۰",
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
            Text(
                "هر روز صادقانه به رابطه‌تون امتیاز بدید — بعد از همگام‌سازی هردو نتیجه رو می‌بینید.",
                style = MaterialTheme.typography.bodySmall,
                color = TextTertiary,
            )
            Spacer(modifier = Modifier.height(16.dp))

            LabeledSlider("ارتباط و گفتگو", state.communication) { v -> viewModel.update { it.copy(communication = v) } }
            LabeledSlider("اعتماد", state.trust) { v -> viewModel.update { it.copy(trust = v) } }
            LabeledSlider("وقت باکیفیت", state.qualityTime) { v -> viewModel.update { it.copy(qualityTime = v) } }
            LabeledSlider("محبت", state.affection) { v -> viewModel.update { it.copy(affection = v) } }
            LabeledSlider("شادی و تفریح", state.funScore) { v -> viewModel.update { it.copy(funScore = v) } }
            LabeledSlider("حمایت", state.support) { v -> viewModel.update { it.copy(support = v) } }

            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = { viewModel.save() },
                enabled = !state.isSaving,
                colors = ButtonDefaults.buttonColors(containerColor = Primary, contentColor = OnPrimary),
                modifier = Modifier.fillMaxWidth(),
            ) { Text(if (state.isSaving) "در حال ذخیره…" else "ثبت امروز") }

            if (partnerLatest != null) {
                Spacer(modifier = Modifier.height(20.dp))
                Text("آخرین ثبت ${viewModel.partnerName}", style = MaterialTheme.typography.labelMedium, color = TextTertiary)
                Spacer(modifier = Modifier.height(6.dp))
                CoupleCard {
                    Text(partnerLatest.date, style = MaterialTheme.typography.labelSmall, color = Primary)
                    Text("ارتباط ${partnerLatest.communication} • اعتماد ${partnerLatest.trust} • وقت ${partnerLatest.qualityTime}", color = TextSecondary, style = MaterialTheme.typography.bodySmall)
                    Text("محبت ${partnerLatest.affection} • شادی ${partnerLatest.funScore} • حمایت ${partnerLatest.support}", color = TextSecondary, style = MaterialTheme.typography.bodySmall)
                }
            }

            if (checkins.isNotEmpty()) {
                Spacer(modifier = Modifier.height(20.dp))
                Text("تاریخچه", style = MaterialTheme.typography.labelMedium, color = TextTertiary)
                Spacer(modifier = Modifier.height(6.dp))
                checkins.take(10).forEach { c ->
                    val avg = (c.communication + c.trust + c.qualityTime + c.affection + c.funScore + c.support) / 6.0
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(c.date, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                        Text("%.1f".format(avg), style = MaterialTheme.typography.bodySmall, color = Primary)
                    }
                }
            }

            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}
