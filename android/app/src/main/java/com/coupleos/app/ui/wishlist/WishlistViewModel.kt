package com.coupleos.app.ui.wishlist

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.WishlistDao
import com.coupleos.app.data.local.entity.WishlistEntity
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

data class WishlistUiState(val refreshing:Boolean=false, val feedback:String?=null)
@Serializable data class WishlistSyncData(val id:String, val title:String, val description:String="", val category:String="", val privacy:String="SHARED", val isCompleted:Boolean=false, val createdBy:String="", val createdAt:String="")

@HiltViewModel
class WishlistViewModel @Inject constructor(
    private val dao: WishlistDao,
    private val storage: SecureStorage,
    private val crypto: CryptoManager,
    private val repo: GitHubRepository,
    private val json: Json,
): ViewModel(){
    val items: StateFlow<List<WishlistEntity>> = dao.getAllWishlists().stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
    private val _ui = MutableStateFlow(WishlistUiState())
    val uiState: StateFlow<WishlistUiState> = _ui
    init{ pull()}
    private fun pull(){ viewModelScope.launch{
        try{
            val remote=repo.readMergedContent(GitHubRepository.WISHLIST_FILE).getOrNull()
            if(remote!=null && remote!="[]"){
                val list=try{ json.decodeFromString<List<WishlistSyncData>>(remote)}catch(_:Exception){ emptyList()}
                for(i in list){
                    val exists = items.value.any{ it.id==i.id}
                    if(!exists) dao.insert(WishlistEntity(id=i.id, title=i.title, description=i.description, category=i.category, privacy=i.privacy, isCompleted=i.isCompleted, createdBy=i.createdBy, createdAt=i.createdAt, updatedAt=i.createdAt))
                }
            }
        }catch(_:Exception){}
    }}
    fun add(title:String, desc:String, cat:String, privacy:String){
        viewModelScope.launch{
            val now=LocalDateTime.now().toString()
            dao.insert(WishlistEntity(id=crypto.generateId(), title=title, description=desc, category=cat, privacy=privacy, createdBy=storage.getUserId()?:"", createdAt=now, updatedAt=now))
            sync()
            _ui.update{ it.copy(feedback="آرزو ثبت و روی توکن ذخیره شد ⭐")}
        }
    }
    fun toggleComplete(id:String){
        viewModelScope.launch{
            val item = items.value.find{ it.id==id} ?: return@launch
            dao.update(item.copy(isCompleted=!item.isCompleted, updatedAt=LocalDateTime.now().toString()))
            sync()
        }
    }
    fun delete(id:String){ viewModelScope.launch{ dao.softDelete(id, LocalDateTime.now().toString()); repo.removeFromList(GitHubRepository.WISHLIST_FILE, id); sync() } }
    fun refresh(){ viewModelScope.launch{ _ui.update{ it.copy(refreshing=true)}; pull(); sync(); _ui.update{ it.copy(refreshing=false, feedback="همگام سازی شد ✅")}; kotlinx.coroutines.delay(2000); _ui.update{ it.copy(feedback=null)} } }
    private suspend fun sync(){
        try{
            val remoteStr=repo.readMergedContent(GitHubRepository.WISHLIST_FILE).getOrNull()?:"[]"
            val remote=try{ json.decodeFromString<List<WishlistSyncData>>(remoteStr)}catch(_:Exception){ emptyList()}
            val local=items.value.map{ WishlistSyncData(it.id,it.title,it.description,it.category,it.privacy,it.isCompleted,it.createdBy,it.createdAt)}
            val merged=mutableMapOf<String, WishlistSyncData>()
            remote.forEach{ merged[it.id]=it}
            local.forEach{ merged[it.id]=it}
            repo.saveFullList(GitHubRepository.WISHLIST_FILE, json.encodeToString(merged.values.toList()))
        }catch(_:Exception){}
    }
    fun clear(){ _ui.update{ it.copy(feedback=null)}}
}
