package com.coupleos.app.ui.letters

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.LoveLetterDao
import com.coupleos.app.data.local.entity.LoveLetterEntity
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

data class LettersUiState(val refreshing:Boolean=false, val feedback:String?=null)
@Serializable data class LetterSyncData(val id:String, val title:String, val content:String, val openOnDate:String="", val isOpened:Boolean=false, val createdBy:String="", val recipientId:String="", val createdAt:String="")

@HiltViewModel
class LettersViewModel @Inject constructor(
    private val dao: LoveLetterDao,
    private val storage: SecureStorage,
    private val crypto: CryptoManager,
    private val repo: GitHubRepository,
    private val json: Json,
): ViewModel(){
    private val userId = storage.getUserId()?:""
    val sent: StateFlow<List<LoveLetterEntity>> = dao.getLettersByUser(userId).stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
    val received: StateFlow<List<LoveLetterEntity>> = dao.getLettersForUser(userId).stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
    private val _ui = MutableStateFlow(LettersUiState())
    val uiState: StateFlow<LettersUiState> = _ui
    init{ pull()}
    private fun pull(){ viewModelScope.launch{
        try{
            val remote=repo.readMergedContent(GitHubRepository.LETTERS_FILE).getOrNull()
            if(remote!=null && remote!="[]"){
                val list=try{ json.decodeFromString<List<LetterSyncData>>(remote)}catch(_:Exception){ emptyList()}
                for(i in list){
                    // check if exists in either sent/received
                    val exists = sent.value.any{ it.id==i.id} || received.value.any{ it.id==i.id}
                    if(!exists) dao.insert(LoveLetterEntity(id=i.id, title=i.title, content=i.content, openOnDate=i.openOnDate, isOpened=i.isOpened, createdBy=i.createdBy, recipientId=i.recipientId, createdAt=i.createdAt))
                }
            }
        }catch(_:Exception){}
    }}
    fun send(title:String, content:String, openOnDate:String){
        viewModelScope.launch{
            val now=LocalDateTime.now().toString()
            val recipient = storage.getPartnerName() // we store by userId, but for now use partner userId if available else couple
            dao.insert(LoveLetterEntity(id=crypto.generateId(), title=title, content=content, openOnDate=openOnDate, createdBy=userId, recipientId=recipient, createdAt=now))
            sync()
            _ui.update{ it.copy(feedback="نامه عاشقانه ثبت و روی توکن ذخیره شد 💌")}
        }
    }
    fun openLetter(id:String){
        viewModelScope.launch{
            val letter = sent.value.find{ it.id==id} ?: received.value.find{ it.id==id} ?: return@launch
            dao.update(letter.copy(isOpened=true))
            sync()
        }
    }
    fun refresh(){ viewModelScope.launch{ _ui.update{ it.copy(refreshing=true)}; pull(); sync(); _ui.update{ it.copy(refreshing=false, feedback="همگام شد ✅")}; kotlinx.coroutines.delay(2000); _ui.update{ it.copy(feedback=null)} } }
    private suspend fun sync(){
        try{
            val remoteStr=repo.readMergedContent(GitHubRepository.LETTERS_FILE).getOrNull()?:"[]"
            val remote=try{ json.decodeFromString<List<LetterSyncData>>(remoteStr)}catch(_:Exception){ emptyList()}
            val local=(sent.value + received.value).map{ LetterSyncData(it.id,it.title,it.content,it.openOnDate,it.isOpened,it.createdBy,it.recipientId,it.createdAt)}
            val merged=mutableMapOf<String, LetterSyncData>(); remote.forEach{ merged[it.id]=it}; local.forEach{ merged[it.id]=it}
            repo.saveFullList(GitHubRepository.LETTERS_FILE, json.encodeToString(merged.values.toList()))
        }catch(_:Exception){}
    }
}
