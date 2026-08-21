package com.coupleos.app.ui.countdown

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.CountdownDao
import com.coupleos.app.data.local.entity.CountdownEntity
import com.coupleos.app.data.repository.GitHubRepository
import com.coupleos.app.security.crypto.CryptoManager
import com.coupleos.app.security.keystore.SecureStorage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.LocalDateTime
import javax.inject.Inject

data class CountdownUiState(val refreshing:Boolean=false, val feedback:String?=null)
@Serializable data class CountdownSyncData(val id:String, val title:String, val targetDate:String, val emoji:String="❤️", val createdBy:String="", val createdAt:String="")

@HiltViewModel
class CountdownViewModel @Inject constructor(
    private val dao: CountdownDao,
    private val storage: SecureStorage,
    private val crypto: CryptoManager,
    private val repo: GitHubRepository,
    private val json: Json,
): ViewModel(){
    val items: StateFlow<List<CountdownEntity>> = dao.getAllCountdowns().stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
    private val _ui = MutableStateFlow(CountdownUiState())
    val uiState: StateFlow<CountdownUiState> = _ui
    init{ pull()}
    private fun pull(){ viewModelScope.launch{
        try{
            val remote=repo.readMergedContent(GitHubRepository.COUNTDOWNS_FILE).getOrNull()
            if(remote!=null && remote!="[]"){
                val list=try{ json.decodeFromString<List<CountdownSyncData>>(remote)}catch(_:Exception){ emptyList()}
                for(i in list){ if(items.value.none{ it.id==i.id}) dao.insert(CountdownEntity(id=i.id, title=i.title, targetDate=i.targetDate, emoji=i.emoji, createdBy=i.createdBy, createdAt=i.createdAt)) }
            }
        }catch(_:Exception){}
    }}
    fun add(title:String, date:String, emoji:String){
        viewModelScope.launch{
            val now=LocalDateTime.now().toString()
            dao.insert(CountdownEntity(id=crypto.generateId(), title=title, targetDate=date, emoji=emoji, createdBy=storage.getUserId()?:"", createdAt=now))
            sync()
            _ui.update{ it.copy(feedback="شمارش اضافه و روی توکن ذخیره شد ⏱️")}
        }
    }
    fun delete(id:String){ viewModelScope.launch{ dao.delete(id); sync() }}
    fun refresh(){ viewModelScope.launch{ _ui.update{ it.copy(refreshing=true)}; pull(); sync(); _ui.update{ it.copy(refreshing=false, feedback="همگام شد ✅")}; kotlinx.coroutines.delay(2000); _ui.update{ it.copy(feedback=null)} } }
    private suspend fun sync(){
        try{
            val remoteStr=repo.readMergedContent(GitHubRepository.COUNTDOWNS_FILE).getOrNull()?:"[]"
            val remote=try{ json.decodeFromString<List<CountdownSyncData>>(remoteStr)}catch(_:Exception){ emptyList()}
            val local=items.value.map{ CountdownSyncData(it.id,it.title,it.targetDate,it.emoji,it.createdBy,it.createdAt)}
            val merged=mutableMapOf<String, CountdownSyncData>(); remote.forEach{ merged[it.id]=it}; local.forEach{ merged[it.id]=it}
            repo.saveFullList(GitHubRepository.COUNTDOWNS_FILE, json.encodeToString(merged.values.toList()))
        }catch(_:Exception){}
    }
    fun clear(){ _ui.update{ it.copy(feedback=null)}}
}
