package com.coupleos.app.ui.expenses

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
import com.coupleos.app.data.local.dao.ExpenseDao
import com.coupleos.app.data.local.entity.ExpenseEntity
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
class ExpensesViewModel @Inject constructor(
    private val expenseDao: ExpenseDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val syncRepository: CoupleSyncRepository,
) : ViewModel() {

    val expenses: StateFlow<List<ExpenseEntity>> = expenseDao.getAllExpenses()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _feedback = MutableStateFlow<String?>(null)
    val feedback: StateFlow<String?> = _feedback

    val myUserId: String get() = secureStorage.getUserId().orEmpty()
    val myName: String get() = secureStorage.getCurrentUserName()
    val partnerName: String get() = secureStorage.getPartnerName()

    fun add(amountText: String, category: String, note: String, paidByMe: Boolean) {
        val amount = amountText.trim().replace(",", "").toDoubleOrNull()
        if (amount == null || amount <= 0) {
            _feedback.value = "مبلغ معتبر وارد کن"
            return
        }
        viewModelScope.launch {
            expenseDao.insert(
                ExpenseEntity(
                    id = cryptoManager.generateId(),
                    amount = amount,
                    currency = "IRR",
                    category = category.ifBlank { "عمومی" },
                    paidBy = if (paidByMe) myUserId else "PARTNER",
                    splitType = "equal",
                    date = LocalDate.now().toString(),
                    note = note.trim(),
                    createdBy = myUserId,
                    createdAt = LocalDateTime.now().toString(),
                    isSynced = false,
                )
            )
            val result = syncRepository.push()
            _feedback.value = if (result.ok) "هزینه ثبت و روی توکن ذخیره شد ✅"
            else "ثبت شد (لوکال) — ${result.message}"
        }
    }

    fun remove(expense: ExpenseEntity) {
        viewModelScope.launch {
            expenseDao.delete(expense.id)
            syncRepository.push()
            _feedback.value = "حذف شد"
        }
    }

    fun clearFeedback() { _feedback.value = null }
}

@Composable
fun ExpensesScreen(onBack: () -> Unit, viewModel: ExpensesViewModel = hiltViewModel()) {
    val expenses by viewModel.expenses.collectAsState()
    val feedback by viewModel.feedback.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showDialog by remember { mutableStateOf(false) }

    LaunchedEffect(feedback) {
        feedback?.let { snackbarHostState.showSnackbar(it); viewModel.clearFeedback() }
    }

    val total = expenses.sumOf { it.amount }
    val paidByMe = expenses.filter { it.paidBy == viewModel.myUserId }.sumOf { it.amount }
    val paidByPartner = total - paidByMe
    val balance = paidByMe - total / 2

    FeatureScaffold(
        title = "هزینه‌های مشترک",
        subtitle = "جمع کل: ${formatMoney(total)} تومان",
        onBack = onBack,
        snackbarHostState = snackbarHostState,
        onFabClick = { showDialog = true },
        fabIcon = { Icon(Icons.Default.Add, contentDescription = "افزودن") },
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                StatChip("${viewModel.myName} پرداخت کرده", formatMoney(paidByMe))
                StatChip("${viewModel.partnerName} پرداخت کرده", formatMoney(paidByPartner))
            }
            Text(
                text = when {
                    balance > 1 -> "${viewModel.partnerName} ${formatMoney(balance)} تومان به تو بدهکاره"
                    balance < -1 -> "تو ${formatMoney(-balance)} تومان به ${viewModel.partnerName} بدهکاری"
                    else -> "حساب‌تون صافه ❤️"
                },
                style = MaterialTheme.typography.bodyMedium,
                color = Primary,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
            )

            if (expenses.isEmpty()) {
                EmptyState("💰", "هنوز هزینه‌ای ثبت نشده", "خرج‌های مشترکتون رو اینجا نگه دارید")
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(expenses, key = { it.id }) { expense ->
                        CoupleCard {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        "${formatMoney(expense.amount)} تومان",
                                        style = MaterialTheme.typography.titleSmall,
                                        color = TextPrimary,
                                    )
                                    Text(
                                        "${expense.category} • ${expense.date}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = TextTertiary,
                                    )
                                    if (expense.note.isNotBlank()) {
                                        Text(expense.note, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                                    }
                                    Text(
                                        if (expense.paidBy == viewModel.myUserId) "پرداخت: ${viewModel.myName}" else "پرداخت: ${viewModel.partnerName}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Primary,
                                    )
                                    SyncBadge(expense.isSynced)
                                }
                                TextButton(onClick = { viewModel.remove(expense) }) {
                                    Text("حذف", color = Danger, style = MaterialTheme.typography.labelSmall)
                                }
                            }
                        }
                    }
                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }
    }

    if (showDialog) {
        var amount by remember { mutableStateOf("") }
        var category by remember { mutableStateOf("") }
        var note by remember { mutableStateOf("") }
        var paidByMe by remember { mutableStateOf(true) }

        CoupleDialog(
            title = "هزینه جدید",
            onDismiss = { showDialog = false },
            onConfirm = { viewModel.add(amount, category, note, paidByMe); showDialog = false },
            confirmEnabled = amount.isNotBlank(),
        ) {
            CoupleTextField(amount, { amount = it }, "مبلغ (تومان)", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(category, { category = it }, "دسته (رستوران، سفر…)", singleLine = true)
            Spacer(modifier = Modifier.height(10.dp))
            CoupleTextField(note, { note = it }, "توضیح", minLines = 2)
            Spacer(modifier = Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = paidByMe, onClick = { paidByMe = true }, label = { Text(viewModel.myName.ifBlank { "من" }) })
                FilterChip(selected = !paidByMe, onClick = { paidByMe = false }, label = { Text(viewModel.partnerName.ifBlank { "پارتنر" }) })
            }
        }
    }
}

private fun formatMoney(value: Double): String {
    val rounded = value.toLong()
    return rounded.toString().reversed().chunked(3).joinToString(",").reversed()
}
