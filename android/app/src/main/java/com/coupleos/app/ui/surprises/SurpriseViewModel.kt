package com.coupleos.app.ui.surprises

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.SurpriseDao
import com.coupleos.app.data.local.entity.SurpriseEntity
import com.coupleos.app.data.repository.GitHubRepository
import com.coupleos.app.data.repository.TokenOwnership
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

data class SurpriseUiState(val feedback:String?=null, val refreshing:Boolean=false)
@Serializable data class SurpriseSyncData(val id:String, val title:String, val content:String, val triggerType:String="", val triggerValue:String="", val isRevealed:Boolean=false, val createdBy:String="", val recipientId:String="", val createdAt:String="")

@HiltViewModel
class SurpriseViewModel @Inject constructor(
    private val dao: SurpriseDao,
    private val storage: SecureStorage,
    private val crypto: CryptoManager,
    private val repo: GitHubRepository,
    private val json: Json,
): ViewModel(){
    private val uid = storage.getUserId()?:""
    val mine: StateFlow<List<SurpriseEntity>> = dao.getSurprisesByUser(uid).stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
    val forMe: StateFlow<List<SurpriseEntity>> = dao.getUnrevealedSurprises(uid).stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
    private val _ui = MutableStateFlow(SurpriseUiState())
    val uiState: StateFlow<SurpriseUiState> = _ui
    init{ pull()}
    private fun pull(){ viewModelScope.launch{
        try{
            val remote=repo.readMergedContent(GitHubRepository.SURPRISES_FILE).getOrNull() ?: return@launch
            if(remote=="[]") return@launch
            val list=try{ json.decodeFromString<List<SurpriseSyncData>>(remote)}catch(_:Exception){ emptyList()}
            for(i in list){
                val exists = mine.value.any{ it.id==i.id} || forMe.value.any{ it.id==i.id}
                if(!exists) dao.insert(SurpriseEntity(id=i.id, title=i.title, content=i.content, triggerType=i.triggerType, triggerValue=i.triggerValue, isRevealed=i.isRevealed, createdBy=i.createdBy, recipientId=i.recipientId, createdAt=i.createdAt))
            }
        }catch(_:Exception){}
    }}
    fun create(title:String, content:String, trigger:String){
        viewModelScope.launch{
            val now=LocalDateTime.now().toString()
            dao.insert(SurpriseEntity(id=crypto.generateId(), title=title, content=content, triggerType=trigger, createdBy=uid, recipientId=storage.getPartnerName(), createdAt=now))
            val r = sync()
            _ui.update{ it.copy(feedback = if(r.isSuccess) TokenOwnership.saved("سورپرایز") else TokenOwnership.failed(r.exceptionOrNull()))}
        }
    }
    fun isReadOnly(id:String) = repo.isReadOnly(GitHubRepository.SURPRISES_FILE, id)
    fun reveal(id:String){
        viewModelScope.launch{
            val item = forMe.value.find{ it.id==id} ?: mine.value.find{ it.id==id} ?: return@launch
            dao.update(item.copy(isRevealed=true))
            // partner-owned surprises are read-only: reveal state stays on this device
            if(!isReadOnly(id)) sync()
        }
    }
    fun refresh(){ viewModelScope.launch{ _ui.update{ it.copy(refreshing=true)}; pull(); sync(); _ui.update{ it.copy(refreshing=false, feedback="بازخوانی شد ✅ — دیتای پارتنر از توکن خودش خونده شد 👁️")}; kotlinx.coroutines.delay(2000); _ui.update{ it.copy(feedback=null)}}}
    private suspend fun sync(): Result<Unit> {
        return try{
            val remoteStr=repo.readMergedContent(GitHubRepository.SURPRISES_FILE).getOrNull()?:"[]"
            val remote=try{ json.decodeFromString<List<SurpriseSyncData>>(remoteStr)}catch(_:Exception){ emptyList()}
            val local=(mine.value+forMe.value).map{ SurpriseSyncData(it.id,it.title,it.content,it.triggerType,it.triggerValue,it.isRevealed,it.createdBy,it.recipientId,it.createdAt)}
            val merged=mutableMapOf<String, SurpriseSyncData>(); remote.forEach{ merged[it.id]=it}; local.forEach{ merged[it.id]=it}
            repo.saveFullList(GitHubRepository.SURPRISES_FILE, json.encodeToString(merged.values.toList()))
        }catch(e:Exception){ Result.failure(e) }
    }
}
