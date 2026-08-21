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
import com.coupleos.app.data.local.dao.MemoryDao
import com.coupleos.app.data.local.dao.MessageDao
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import androidx.lifecycle.viewModelScope
import javax.inject.Inject

@HiltViewModel
class SearchViewModel @Inject constructor(private val memoryDao: MemoryDao, private val messageDao: MessageDao): ViewModel(){
    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query
    fun update(q:String){ _query.value=q}
    // For simplicity search triggers via UI collecting query
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(vm: SearchViewModel = hiltViewModel()){
    val query by vm.query.collectAsState()
    var results by remember{ mutableStateOf(listOf<String>())}
    Scaffold(containerColor=com.coupleos.app.ui.theme.Background, topBar={ TopAppBar(title={Text("جستجو 🔍", color=com.coupleos.app.ui.theme.TextPrimary)}, colors=TopAppBarDefaults.topAppBarColors(containerColor=com.coupleos.app.ui.theme.Surface))}){ pad->
        Column(Modifier.fillMaxSize().padding(pad).padding(16.dp)){
            OutlinedTextField(value=query, onValueChange={ vm.update(it); results = if(it.length>=2) listOf("خاطرات: جستجو برای \"$it\"","چت: جستجو برای \"$it\"","تقویم: جستجو برای \"$it\"") else emptyList()}, label={Text("چی رو میگردی؟")}, leadingIcon={ Icon(Icons.Default.Search,null, tint=com.coupleos.app.ui.theme.TextTertiary)}, singleLine=true, modifier=Modifier.fillMaxWidth())
            Spacer(Modifier.height(16.dp))
            if(query.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment=Alignment.Center){ Column(horizontalAlignment=Alignment.CenterHorizontally){ Text("🔍", fontSize=48.sp); Text("جستجو در خاطرات، چت، تقویم ...", color=com.coupleos.app.ui.theme.TextTertiary)}}
            else if(results.isEmpty()) Text("حداقل ۲ حرف بنویس", color=com.coupleos.app.ui.theme.TextTertiary)
            else LazyColumn(verticalArrangement=Arrangement.spacedBy(8.dp)){
                items(results){ r->
                    Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=com.coupleos.app.ui.theme.Surface), shape=RoundedCornerShape(12.dp)){
                        Text(r, Modifier.padding(12.dp), color=com.coupleos.app.ui.theme.TextPrimary)
                    }
                }
            }
        }
    }
}
