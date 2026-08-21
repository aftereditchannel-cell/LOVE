package com.coupleos.app.ui.search

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.*
import com.coupleos.app.security.keystore.SecureStorage
import com.coupleos.app.ui.common.*
import com.coupleos.app.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SearchHit(
    val kind: String,
    val title: String,
    val subtitle: String,
    val date: String,
)

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val memoryDao: MemoryDao,
    private val messageDao: MessageDao,
    private val journalDao: JournalDao,
    private val taskDao: TaskDao,
    private val calendarDao: CalendarDao,
    private val wishlistDao: WishlistDao,
    private val bucketItemDao: BucketItemDao,
    private val secureStorage: SecureStorage,
) : ViewModel() {

    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query

    private val _results = MutableStateFlow<List<SearchHit>>(emptyList())
    val results: StateFlow<List<SearchHit>> = _results

    private val _isSearching = MutableStateFlow(false)
    val isSearching: StateFlow<Boolean> = _isSearching

    fun updateQuery(text: String) {
        _query.value = text
        if (text.trim().length >= 2) search(text.trim()) else _results.value = emptyList()
    }

    private fun search(q: String) {
        viewModelScope.launch {
            _isSearching.value = true
            val hits = mutableListOf<SearchHit>()
            val lower = q.lowercase()

            fun matches(vararg fields: String) = fields.any { it.lowercase().contains(lower) }

            runCatching {
                memoryDao.getAllOnce()
                    .filter { it.deletedAt == null && matches(it.title, it.description, it.tags, it.location) }
                    .forEach { hits.add(SearchHit("خاطره", it.title, it.description, it.date)) }
            }
            runCatching {
                messageDao.getAllOnce()
                    .filter { !it.isDeleted && matches(it.content) }
                    .forEach { hits.add(SearchHit("پیام", it.content, "", it.createdAt.take(10))) }
            }
            runCatching {
                journalDao.getAllOnce()
                    .filter { it.deletedAt == null && matches(it.title, it.content) }
                    .forEach { hits.add(SearchHit("یادداشت", it.title, it.content.take(80), it.date)) }
            }
            runCatching {
                taskDao.getAllOnce()
                    .filter { it.deletedAt == null && matches(it.title, it.description) }
                    .forEach { hits.add(SearchHit("کار", it.title, it.description, it.dueDate)) }
            }
            runCatching {
                calendarDao.getAllOnce()
                    .filter { it.deletedAt == null && matches(it.title, it.description) }
                    .forEach { hits.add(SearchHit("رویداد", it.title, it.description, it.date)) }
            }
            runCatching {
                wishlistDao.getAllOnce()
                    .filter { it.deletedAt == null && matches(it.title, it.description) }
                    .forEach { hits.add(SearchHit("آرزو", it.title, it.description, "")) }
            }
            runCatching {
                bucketItemDao.getAllOnce()
                    .filter { it.deletedAt == null && matches(it.title, it.description) }
                    .forEach { hits.add(SearchHit("خواسته", it.title, it.description, "")) }
            }

            _results.value = hits
            _isSearching.value = false
        }
    }
}

@Composable
fun SearchScreen(onBack: () -> Unit, viewModel: SearchViewModel = hiltViewModel()) {
    val query by viewModel.query.collectAsState()
    val results by viewModel.results.collectAsState()
    val isSearching by viewModel.isSearching.collectAsState()

    FeatureScaffold(
        title = "جستجو",
        subtitle = if (results.isNotEmpty()) "${results.size} نتیجه" else null,
        onBack = onBack,
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize().padding(horizontal = 20.dp)) {
            CoupleTextField(query, { viewModel.updateQuery(it) }, "دنبال چی می‌گردی؟", singleLine = true)
            Spacer(modifier = Modifier.height(12.dp))

            when {
                isSearching -> Text("در حال جستجو…", color = TextTertiary)
                query.trim().length < 2 -> EmptyState("🔍", "همه‌جای دنیای کوچیکمون رو بگرد", "حداقل ۲ حرف بنویس")
                results.isEmpty() -> EmptyState("🤷", "چیزی پیدا نشد", null)
                else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(results) { hit ->
                        CoupleCard {
                            Text(hit.kind, style = MaterialTheme.typography.labelSmall, color = Primary)
                            Text(hit.title, style = MaterialTheme.typography.titleSmall, color = TextPrimary)
                            if (hit.subtitle.isNotBlank()) {
                                Text(hit.subtitle, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                            }
                            if (hit.date.isNotBlank()) {
                                Text(hit.date, style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                            }
                        }
                    }
                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }
    }
}
