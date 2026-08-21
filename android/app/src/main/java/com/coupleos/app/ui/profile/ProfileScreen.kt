package com.coupleos.app.ui.profile

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
import com.coupleos.app.data.local.dao.CoupleDao
import com.coupleos.app.data.local.dao.UserDao
import com.coupleos.app.data.local.entity.CoupleEntity
import com.coupleos.app.data.local.entity.UserEntity
import com.coupleos.app.data.repository.CoupleSyncRepository
import com.coupleos.app.security.keystore.SecureStorage
import com.coupleos.app.ui.common.*
import com.coupleos.app.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.temporal.ChronoUnit
import javax.inject.Inject

data class ProfileUiState(
    val name: String = "",
    val nickname: String = "",
    val birthday: String = "",
    val favoriteColor: String = "",
    val favoriteThings: String = "",
    val loveLanguage: String = "",
    val partnerName: String = "",
    val partnerNickname: String = "",
    val partnerBirthday: String = "",
    val coupleStartDate: String = "",
    val favoriteSong: String = "",
    val favoritePlace: String = "",
    val ourStory: String = "",
    val daysTogether: Long = 0,
    val message: String? = null,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val userDao: UserDao,
    private val coupleDao: CoupleDao,
    private val secureStorage: SecureStorage,
    private val syncRepository: CoupleSyncRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState

    private val myId: String get() = secureStorage.getUserId().orEmpty()
    private val myRole: String get() = secureStorage.getUserRole().orEmpty()

    init { load() }

    private fun load() {
        viewModelScope.launch {
            val me = userDao.getUserById(myId)
            val everyone = userDao.getAllOnce()
            val partner = everyone.firstOrNull { it.id != myId }
            val couple = coupleDao.getCouple()

            _uiState.update {
                it.copy(
                    name = me?.name ?: secureStorage.getCurrentUserName(),
                    nickname = me?.nickname.orEmpty(),
                    birthday = me?.birthday.orEmpty(),
                    favoriteColor = me?.favoriteColor.orEmpty(),
                    favoriteThings = me?.favoriteThings.orEmpty(),
                    loveLanguage = me?.loveLanguage.orEmpty(),
                    partnerName = partner?.name ?: secureStorage.getPartnerName(),
                    partnerNickname = partner?.nickname.orEmpty(),
                    partnerBirthday = partner?.birthday.orEmpty(),
                    coupleStartDate = couple?.startDate.orEmpty(),
                    favoriteSong = couple?.favoriteSong.orEmpty(),
                    favoritePlace = couple?.favoritePlace.orEmpty(),
                    ourStory = couple?.ourStory.orEmpty(),
                    daysTogether = couple?.startDate?.let { d ->
                        runCatching { ChronoUnit.DAYS.between(LocalDate.parse(d), LocalDate.now()) }.getOrNull()
                    } ?: 0L,
                )
            }
        }
    }

    fun update(transform: (ProfileUiState) -> ProfileUiState) { _uiState.update(transform) }

    fun save() {
        viewModelScope.launch {
            val s = _uiState.value
            val now = LocalDateTime.now().toString()

            userDao.insert(
                UserEntity(
                    id = myId,
                    role = myRole,
                    name = s.name.ifBlank { secureStorage.getCurrentUserName() },
                    nickname = s.nickname,
                    birthday = s.birthday,
                    favoriteColor = s.favoriteColor,
                    favoriteThings = s.favoriteThings,
                    loveLanguage = s.loveLanguage,
                    createdAt = now,
                    updatedAt = now,
                    isSynced = false,
                )
            )

            if (myRole == "PERSON_A") secureStorage.savePersonAName(s.name)
            if (myRole == "PERSON_B") secureStorage.savePersonBName(s.name)

            val existingCouple = coupleDao.getCouple()
            coupleDao.insert(
                CoupleEntity(
                    id = existingCouple?.id ?: secureStorage.getCoupleId().orEmpty().ifBlank { "couple-1" },
                    name = "${secureStorage.getPersonAName()} & ${secureStorage.getPersonBName()}",
                    startDate = s.coupleStartDate,
                    anniversary = s.coupleStartDate,
                    favoritePlace = s.favoritePlace,
                    favoriteSong = s.favoriteSong,
                    ourStory = s.ourStory,
                    personAId = existingCouple?.personAId ?: myId,
                    personBId = existingCouple?.personBId ?: "",
                    createdAt = existingCouple?.createdAt ?: now,
                    updatedAt = now,
                    isSynced = false,
                )
            )

            val result = syncRepository.push()
            _uiState.update {
                it.copy(message = if (result.ok) "پروفایل ذخیره و روی توکن ثبت شد ✅" else "ذخیره شد (لوکال) — ${result.message}")
            }
            load()
        }
    }

    fun clearMessage() { _uiState.update { it.copy(message = null) } }
}

@Composable
fun ProfileScreen(onBack: () -> Unit, viewModel: ProfileViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(state.message) {
        state.message?.let { snackbarHostState.showSnackbar(it); viewModel.clearMessage() }
    }

    FeatureScaffold(
        title = "پروفایل",
        subtitle = if (state.daysTogether > 0) "${state.daysTogether} روز با هم ❤️" else null,
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
            Text("درباره من", style = MaterialTheme.typography.labelMedium, color = TextTertiary)
            Spacer(modifier = Modifier.height(8.dp))
            CoupleTextField(state.name, { v -> viewModel.update { it.copy(name = v) } }, "اسم", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(state.nickname, { v -> viewModel.update { it.copy(nickname = v) } }, "اسم مستعار", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(state.birthday, { v -> viewModel.update { it.copy(birthday = v) } }, "تولد (YYYY-MM-DD)", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(state.favoriteColor, { v -> viewModel.update { it.copy(favoriteColor = v) } }, "رنگ مورد علاقه", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(state.favoriteThings, { v -> viewModel.update { it.copy(favoriteThings = v) } }, "چیزهایی که دوست دارم", minLines = 2)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(state.loveLanguage, { v -> viewModel.update { it.copy(loveLanguage = v) } }, "زبان عشقم", singleLine = true)

            Spacer(modifier = Modifier.height(20.dp))
            Text("درباره ما", style = MaterialTheme.typography.labelMedium, color = TextTertiary)
            Spacer(modifier = Modifier.height(8.dp))
            CoupleTextField(state.coupleStartDate, { v -> viewModel.update { it.copy(coupleStartDate = v) } }, "شروع رابطه (YYYY-MM-DD)", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(state.favoriteSong, { v -> viewModel.update { it.copy(favoriteSong = v) } }, "آهنگ ما", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(state.favoritePlace, { v -> viewModel.update { it.copy(favoritePlace = v) } }, "جای مورد علاقه ما", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(state.ourStory, { v -> viewModel.update { it.copy(ourStory = v) } }, "داستان ما در چند خط", minLines = 3)

            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = { viewModel.save() },
                colors = ButtonDefaults.buttonColors(containerColor = Primary, contentColor = OnPrimary),
                modifier = Modifier.fillMaxWidth(),
            ) { Text("ذخیره روی توکن") }

            if (state.partnerName.isNotBlank()) {
                Spacer(modifier = Modifier.height(20.dp))
                Text("پارتنر", style = MaterialTheme.typography.labelMedium, color = TextTertiary)
                Spacer(modifier = Modifier.height(8.dp))
                CoupleCard {
                    Text(state.partnerName, style = MaterialTheme.typography.titleSmall, color = TextPrimary)
                    if (state.partnerNickname.isNotBlank()) {
                        Text(state.partnerNickname, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                    if (state.partnerBirthday.isNotBlank()) {
                        Text("🎂 ${state.partnerBirthday}", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                }
            }

            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}
