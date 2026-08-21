package com.coupleos.app.ui.surprises

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.SurpriseDao
import com.coupleos.app.data.local.entity.SurpriseEntity
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
            val remote=repo.readMergedContent(GitHubRepository.LETTERS_FILE).getOrNull() ?: return@launch
            // surprises share same file? use separate but for now same logic
            if(remote=="[]") return@launch
        }catch(_:Exception){}
    }}
    fun create(title:String, content:String, trigger:String){
        viewModelScope.launch{
            val now=LocalDateTime.now().toString()
            dao.insert(SurpriseEntity(id=crypto.generateId(), title=title, content=content, triggerType=trigger, createdBy=uid, recipientId=storage.getPartnerName(), createdAt=now))
            sync()
            _ui.update{ it.copy(feedback="سورپرایز ساخته و روی توکن ذخیره شد 🎁")}
        }
    }
    fun reveal(id:String){
        viewModelScope.launch{
            val item = forMe.value.find{ it.id==id} ?: mine.value.find{ it.id==id} ?: return@launch
            dao.update(item.copy(isRevealed=true))
            sync()
        }
    }
    fun refresh(){ viewModelScope.launch{ _ui.update{ it.copy(refreshing=true)}; sync(); _ui.update{ it.copy(refreshing=false, feedback="همگام شد ✅")}; kotlinx.coroutines.delay(2000); _ui.update{ it.copy(feedback=null)}}}
    private suspend fun sync(){
        try{
            val local=(mine.value+forMe.value).map{ SurpriseSyncData(it.id,it.title,it.content,it.triggerType,it.triggerValue,it.isRevealed,it.createdBy,it.recipientId,it.createdAt)}
            repo.saveFullList("surprises.json", json.encodeToString(local))
        }catch(_:Exception){}
    }
}
