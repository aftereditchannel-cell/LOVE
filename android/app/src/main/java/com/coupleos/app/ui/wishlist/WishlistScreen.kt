package com.coupleos.app.ui.wishlist

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
import com.coupleos.app.data.local.dao.WishlistDao
import com.coupleos.app.data.local.entity.WishlistEntity
import com.coupleos.app.data.repository.CoupleSyncRepository
import com.coupleos.app.security.crypto.CryptoManager
import com.coupleos.app.security.keystore.SecureStorage
import com.coupleos.app.ui.common.*
import com.coupleos.app.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import javax.inject.Inject

@HiltViewModel
class WishlistViewModel @Inject constructor(
    private val wishlistDao: WishlistDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val syncRepository: CoupleSyncRepository,
) : ViewModel() {

    val items: StateFlow<List<WishlistEntity>> = wishlistDao.getAllWishlists()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _feedback = MutableStateFlow<String?>(null)
    val feedback: StateFlow<String?> = _feedback

    fun add(title: String, description: String, category: String, isPrivate: Boolean) {
        if (title.isBlank()) return
        viewModelScope.launch {
            val now = LocalDateTime.now().toString()
            wishlistDao.insert(
                WishlistEntity(
                    id = cryptoManager.generateId(),
                    title = title.trim(),
                    description = description.trim(),
                    category = category,
                    privacy = if (isPrivate) "PRIVATE" else "SHARED",
                    createdBy = secureStorage.getUserId().orEmpty(),
                    createdAt = now,
                    updatedAt = now,
                    isSynced = false,
                )
            )
            push("آرزو ثبت شد")
        }
    }

    fun toggleCompleted(item: WishlistEntity) {
        viewModelScope.launch {
            wishlistDao.update(
                item.copy(
                    isCompleted = !item.isCompleted,
                    updatedAt = LocalDateTime.now().toString(),
                    isSynced = false,
                )
            )
            push(null)
        }
    }

    fun remove(item: WishlistEntity) {
        viewModelScope.launch {
            wishlistDao.softDelete(item.id, LocalDateTime.now().toString())
            push("حذف شد")
        }
    }

    private suspend fun push(prefix: String?) {
        val result = syncRepository.push()
        _feedback.value = when {
            prefix != null && result.ok -> "$prefix و روی توکن ذخیره شد ✅"
            prefix != null -> "$prefix (لوکال) — ${result.message}"
            result.ok -> null
            else -> result.message
        }
    }

    fun clearFeedback() { _feedback.value = null }
}

@Composable
fun WishlistScreen(onBack: () -> Unit, viewModel: WishlistViewModel = hiltViewModel()) {
    val items by viewModel.items.collectAsState()
    val feedback by viewModel.feedback.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showDialog by remember { mutableStateOf(false) }

    LaunchedEffect(feedback) {
        feedback?.let { snackbarHostState.showSnackbar(it); viewModel.clearFeedback() }
    }

    FeatureScaffold(
        title = "لیست آرزوها",
        subtitle = "${items.count { !it.isCompleted }} آرزوی باقی‌مانده",
        onBack = onBack,
        snackbarHostState = snackbarHostState,
        onFabClick = { showDialog = true },
        fabIcon = { Icon(Icons.Default.Add, contentDescription = "افزودن") },
    ) { padding ->
        if (items.isEmpty()) {
            Box(modifier = Modifier.padding(padding)) {
                EmptyState("⭐", "هنوز آرزویی ثبت نکردید", "چیزی که دوست داری داشته باشی رو بنویس")
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(items, key = { it.id }) { item ->
                    CoupleCard {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(
                                checked = item.isCompleted,
                                onCheckedChange = { viewModel.toggleCompleted(item) },
                                colors = CheckboxDefaults.colors(checkedColor = Primary, uncheckedColor = TextTertiary),
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.title, style = MaterialTheme.typography.titleSmall, color = TextPrimary)
                                if (item.description.isNotBlank()) {
                                    Text(item.description, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    if (item.category.isNotBlank()) {
                                        Text(item.category, style = MaterialTheme.typography.labelSmall, color = Primary)
                                    }
                                    Text(
                                        if (item.privacy == "PRIVATE") "خصوصی" else "مشترک",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = TextTertiary,
                                    )
                                    SyncBadge(item.isSynced)
                                }
                            }
                            TextButton(onClick = { viewModel.remove(item) }) {
                                Text("حذف", color = Danger, style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }

    if (showDialog) {
        var title by remember { mutableStateOf("") }
        var description by remember { mutableStateOf("") }
        var category by remember { mutableStateOf("") }
        var isPrivate by remember { mutableStateOf(false) }

        CoupleDialog(
            title = "آرزوی جدید",
            onDismiss = { showDialog = false },
            onConfirm = { viewModel.add(title, description, category, isPrivate); showDialog = false },
            confirmEnabled = title.isNotBlank(),
        ) {
            CoupleTextField(title, { title = it }, "چی آرزو داری؟", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(description, { description = it }, "توضیح", minLines = 2)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(category, { category = it }, "دسته (مثلاً سفر، هدیه)", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Switch(
                    checked = isPrivate,
                    onCheckedChange = { isPrivate = it },
                    colors = SwitchDefaults.colors(checkedThumbColor = Primary, checkedTrackColor = PrimaryContainer),
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("فقط برای خودم بمونه", color = TextSecondary, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}
