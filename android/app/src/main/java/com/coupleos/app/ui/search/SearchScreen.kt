package com.coupleos.app.ui.search

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.JournalDao
import com.coupleos.app.data.local.dao.MemoryDao
import com.coupleos.app.data.local.dao.MessageDao
import com.coupleos.app.data.local.dao.TaskDao
import com.coupleos.app.security.keystore.SecureStorage
import com.coupleos.app.ui.Screen
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SearchHit(val type: String, val title: String, val extra: String, val route: String)

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val memoryDao: MemoryDao,
    private val messageDao: MessageDao,
    private val journalDao: JournalDao,
    private val taskDao: TaskDao,
    private val storage: SecureStorage,
) : ViewModel() {
    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query
    private val _hits = MutableStateFlow<List<SearchHit>>(emptyList())
    val hits: StateFlow<List<SearchHit>> = _hits

    fun update(q: String) {
        _query.value = q
        viewModelScope.launch {
            if (q.trim().length < 2) {
                _hits.value = emptyList()
                return@launch
            }
            val found = mutableListOf<SearchHit>()
            memoryDao.searchMemories(q).first().forEach {
                found += SearchHit("خاطره", it.title, it.description, Screen.Memories.route)
            }
            messageDao.searchMessages(storage.getCoupleId() ?: "", q).first().forEach {
                found += SearchHit("چت", it.content.take(60), "", Screen.Chat.route)
            }
            journalDao.getAllEntries().first().filter {
                it.title.contains(q, true) || it.content.contains(q, true)
            }.forEach {
                found += SearchHit("دفتر", it.title, it.content.take(60), Screen.Journal.route)
            }
            taskDao.getAllTasks().first().filter {
                it.title.contains(q, true) || it.description.contains(q, true)
            }.forEach {
                found += SearchHit("کار", it.title, it.description, Screen.Tasks.route)
            }
            _hits.update { found.take(40) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    vm: SearchViewModel = hiltViewModel(),
    onOpen: (String) -> Unit = {},
) {
    val query by vm.query.collectAsState()
    val hits by vm.hits.collectAsState()
    Scaffold(
        containerColor = com.coupleos.app.ui.theme.Background,
        topBar = {
            TopAppBar(
                title = { Text("جستجو 🔍", color = com.coupleos.app.ui.theme.TextPrimary) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = com.coupleos.app.ui.theme.Surface),
            )
        }
    ) { pad ->
        Column(Modifier.fillMaxSize().padding(pad).padding(16.dp)) {
            OutlinedTextField(
                value = query,
                onValueChange = { vm.update(it) },
                label = { Text("چی رو می‌گردی؟") },
                leadingIcon = { Icon(Icons.Default.Search, null, tint = com.coupleos.app.ui.theme.TextTertiary) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(16.dp))
            when {
                query.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("🔍", fontSize = 48.sp)
                        Text("جستجو در خاطرات، چت، دفتر، کارها", color = com.coupleos.app.ui.theme.TextTertiary)
                    }
                }
                query.length < 2 -> Text("حداقل ۲ حرف بنویس", color = com.coupleos.app.ui.theme.TextTertiary)
                hits.isEmpty() -> Text("چیزی پیدا نشد", color = com.coupleos.app.ui.theme.TextTertiary)
                else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(hits) { r ->
                        Card(
                            Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = com.coupleos.app.ui.theme.Surface),
                            shape = RoundedCornerShape(12.dp),
                            onClick = { onOpen(r.route) },
                        ) {
                            Column(Modifier.padding(12.dp)) {
                                Text(r.type, color = com.coupleos.app.ui.theme.Primary, style = MaterialTheme.typography.labelSmall)
                                Text(r.title, color = com.coupleos.app.ui.theme.TextPrimary)
                                if (r.extra.isNotEmpty()) Text(r.extra, color = com.coupleos.app.ui.theme.TextSecondary, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }
        }
    }
}
