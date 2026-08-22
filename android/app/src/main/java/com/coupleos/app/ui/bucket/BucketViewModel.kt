package com.coupleos.app.ui.bucket

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.BucketItemDao
import com.coupleos.app.data.local.entity.BucketItemEntity
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

data class BucketUiState(val refreshing:Boolean=false, val feedback:String?=null)
@Serializable data class BucketSyncData(val id:String, val title:String, val description:String="", val isCompleted:Boolean=false, val completedDate:String="", val photoUrl:String="", val createdBy:String="", val createdAt:String="")

@HiltViewModel
class BucketViewModel @Inject constructor(
    private val dao: BucketItemDao,
    private val storage: SecureStorage,
    private val crypto: CryptoManager,
    private val repo: GitHubRepository,
    private val json: Json,
): ViewModel(){
    val items: StateFlow<List<BucketItemEntity>> = dao.getAllItems().stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
    private val _ui = MutableStateFlow(BucketUiState())
    val uiState: StateFlow<BucketUiState> = _ui
    init{ pull()}
    private fun pull(){ viewModelScope.launch{
        try{
            val remote=repo.readMergedContent(GitHubRepository.BUCKET_FILE).getOrNull()
            if(remote!=null && remote!="[]"){
                val list=try{ json.decodeFromString<List<BucketSyncData>>(remote)}catch(_:Exception){ emptyList()}
                for(i in list){ if(items.value.none{ it.id==i.id}) dao.insert(BucketItemEntity(id=i.id, title=i.title, description=i.description, isCompleted=i.isCompleted, completedDate=i.completedDate, photoUrl=i.photoUrl, createdBy=i.createdBy, createdAt=i.createdAt, updatedAt=i.createdAt)) }
            }
        }catch(_:Exception){}
    }}
    fun add(title:String, desc:String){
        viewModelScope.launch{
            val now=LocalDateTime.now().toString()
            dao.insert(BucketItemEntity(id=crypto.generateId(), title=title, description=desc, createdBy=storage.getUserId()?:"", createdAt=now, updatedAt=now))
            sync()
            _ui.update{ it.copy(feedback="به لیست اضافه و روی توکن ذخیره شد ✓")}
        }
    }
    fun toggle(id:String){ viewModelScope.launch{
        val itm=items.value.find{ it.id==id} ?: return@launch
        dao.update(itm.copy(isCompleted=!itm.isCompleted, completedDate=if(!itm.isCompleted) java.time.LocalDate.now().toString() else "", updatedAt=LocalDateTime.now().toString()))
        sync()
    }}
    fun delete(id:String){ viewModelScope.launch{ dao.softDelete(id, LocalDateTime.now().toString()); repo.removeFromList(GitHubRepository.BUCKET_FILE, id); sync() }}
    fun refresh(){ viewModelScope.launch{ _ui.update{ it.copy(refreshing=true)}; pull(); sync(); _ui.update{ it.copy(refreshing=false, feedback="همگام شد ✅")}; kotlinx.coroutines.delay(2000); _ui.update{ it.copy(feedback=null)} } }
    private suspend fun sync(){
        try{
            val remoteStr=repo.readMergedContent(GitHubRepository.BUCKET_FILE).getOrNull()?:"[]"
            val remote=try{ json.decodeFromString<List<BucketSyncData>>(remoteStr)}catch(_:Exception){ emptyList()}
            val local=items.value.map{ BucketSyncData(it.id,it.title,it.description,it.isCompleted,it.completedDate,it.photoUrl,it.createdBy,it.createdAt)}
            val merged=mutableMapOf<String, BucketSyncData>()
            remote.forEach{ merged[it.id]=it}
            local.forEach{ merged[it.id]=it}
            repo.saveFullList(GitHubRepository.BUCKET_FILE, json.encodeToString(merged.values.toList()))
        }catch(_:Exception){}
    }
    fun clear(){ _ui.update{ it.copy(feedback=null)}}
}
