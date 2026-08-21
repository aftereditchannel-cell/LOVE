package com.coupleos.app.ui.more

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavController
import com.coupleos.app.R
import com.coupleos.app.data.repository.CoupleSyncRepository
import com.coupleos.app.data.repository.SyncState
import com.coupleos.app.security.keystore.SecureStorage
import com.coupleos.app.ui.Screen
import com.coupleos.app.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MoreViewModel @Inject constructor(
    private val syncRepository: CoupleSyncRepository,
    private val secureStorage: SecureStorage,
) : ViewModel() {

    val syncState: StateFlow<SyncState> = syncRepository.state

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message

    val myUsername: String? get() = secureStorage.getMyGitHubUsername()
    val partnerUsername: String? get() = secureStorage.getPartnerGitHubUsername()

    fun syncNow() {
        viewModelScope.launch {
            val result = syncRepository.sync()
            _message.value = result.message
        }
    }

    fun clearMessage() { _message.value = null }
}

@Composable
fun MoreScreen(
    navController: NavController,
    onLock: () -> Unit = {},
    viewModel: MoreViewModel = hiltViewModel(),
) {
    val syncState by viewModel.syncState.collectAsState()
    val message by viewModel.message.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(message) {
        message?.let { snackbarHostState.showSnackbar(it); viewModel.clearMessage() }
    }

    Scaffold(
        containerColor = Background,
        snackbarHost = {
            SnackbarHost(snackbarHostState) { data ->
                Snackbar(snackbarData = data, containerColor = SurfaceElevated, contentColor = TextPrimary)
            }
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Background)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = stringResource(R.string.nav_more),
                style = MaterialTheme.typography.headlineMedium,
                color = TextPrimary,
            )

            Spacer(modifier = Modifier.height(16.dp))

            // ── Sync status card ───────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(Surface)
                    .padding(16.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("وضعیت ذخیره‌سازی روی توکن", style = MaterialTheme.typography.titleSmall, color = TextPrimary)
                        Text(
                            text = syncState.lastSyncAt?.let { "آخرین بار: ${it.take(16).replace('T', ' ')}" }
                                ?: "هنوز چیزی ذخیره نشده",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextTertiary,
                        )
                        syncState.lastMessage?.let {
                            Text(
                                text = it,
                                style = MaterialTheme.typography.labelSmall,
                                color = if (syncState.lastOk == false) Danger else Success,
                            )
                        }
                    }
                    if (syncState.isSyncing) {
                        CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Primary, strokeWidth = 2.dp)
                    } else {
                        TextButton(onClick = { viewModel.syncNow() }) {
                            Text("همگام‌سازی", color = Primary)
                        }
                    }
                }
                Text(
                    text = "${viewModel.myUsername ?: "?"} ⟷ ${viewModel.partnerUsername ?: "?"}",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextTertiary,
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Section: Personal
            SectionTitle("شخصی")
            MoreMenuItem(Icons.Outlined.Person, stringResource(R.string.more_profile)) {
                navController.navigate(Screen.Profile.route)
            }
            MoreMenuItem(Icons.Outlined.Mood, "حال روزانه") {
                navController.navigate(Screen.Mood.route)
            }
            MoreMenuItem(Icons.Outlined.Book, "دفتر خاطرات") {
                navController.navigate(Screen.Journal.route)
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Section: Together
            SectionTitle("دنیای ما")
            MoreMenuItem(Icons.Outlined.AutoStories, stringResource(R.string.more_our_story)) {
                navController.navigate(Screen.OurStory.route)
            }
            MoreMenuItem(Icons.Outlined.PhotoCamera, stringResource(R.string.more_photos)) {
                navController.navigate(Screen.Memories.route)
            }
            MoreMenuItem(Icons.Outlined.Star, stringResource(R.string.more_wishlist)) {
                navController.navigate(Screen.Wishlist.route)
            }
            MoreMenuItem(Icons.Outlined.Checklist, stringResource(R.string.more_bucket_list)) {
                navController.navigate(Screen.BucketList.route)
            }
            MoreMenuItem(Icons.Outlined.Timer, stringResource(R.string.more_countdown)) {
                navController.navigate(Screen.Countdown.route)
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Section: Special
            SectionTitle("ویژه")
            MoreMenuItem(Icons.Outlined.Email, stringResource(R.string.more_love_letters)) {
                navController.navigate(Screen.Letters.route)
            }
            MoreMenuItem(Icons.Outlined.CardGiftcard, stringResource(R.string.more_surprises)) {
                navController.navigate(Screen.Surprises.route)
            }
            MoreMenuItem(Icons.Outlined.Restaurant, stringResource(R.string.more_date_planner)) {
                navController.navigate(Screen.DatePlanner.route)
            }
            MoreMenuItem(Icons.Outlined.QuestionAnswer, stringResource(R.string.more_questions)) {
                navController.navigate(Screen.Questions.route)
            }
            MoreMenuItem(Icons.Outlined.Favorite, stringResource(R.string.more_relationship)) {
                navController.navigate(Screen.Relationship.route)
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Section: Manage
            SectionTitle("مدیریت")
            MoreMenuItem(Icons.Outlined.CheckCircle, stringResource(R.string.more_tasks)) {
                navController.navigate(Screen.Tasks.route)
            }
            MoreMenuItem(Icons.Outlined.AccountBalanceWallet, stringResource(R.string.more_expenses)) {
                navController.navigate(Screen.Expenses.route)
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Section: Tools
            SectionTitle("ابزار")
            MoreMenuItem(Icons.Outlined.Search, "جستجو") {
                navController.navigate(Screen.Search.route)
            }
            MoreMenuItem(Icons.Outlined.SmartToy, stringResource(R.string.more_ai)) {
                navController.navigate(Screen.Assistant.route)
            }
            MoreMenuItem(Icons.Outlined.Settings, stringResource(R.string.more_settings)) {
                navController.navigate(Screen.Settings.route)
            }
            MoreMenuItem(Icons.Outlined.Lock, stringResource(R.string.quick_lock)) { onLock() }

            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

@Composable
private fun SectionTitle(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.labelMedium,
        color = TextTertiary,
        modifier = Modifier.padding(vertical = 8.dp),
    )
}

@Composable
private fun MoreMenuItem(
    icon: ImageVector,
    title: String,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 14.dp, horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = title,
            tint = Primary,
            modifier = Modifier.size(22.dp),
        )
        Spacer(modifier = Modifier.width(16.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.bodyLarge,
            color = TextPrimary,
            modifier = Modifier.weight(1f),
        )
        Icon(
            imageVector = Icons.Outlined.ChevronLeft,
            contentDescription = null,
            tint = TextTertiary,
            modifier = Modifier.size(18.dp),
        )
    }
    HorizontalDivider(color = DividerColor, thickness = 0.5.dp)
}
