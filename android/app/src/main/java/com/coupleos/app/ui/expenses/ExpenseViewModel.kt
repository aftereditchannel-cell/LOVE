package com.coupleos.app.ui.expenses

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.ExpenseDao
import com.coupleos.app.data.local.entity.ExpenseEntity
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

data class ExpenseUiState(val refreshing:Boolean=false, val feedback:String?=null)
@Serializable data class ExpenseSyncData(val id:String, val amount:Double, val category:String, val paidBy:String, val date:String, val note:String, val createdAt:String)

@HiltViewModel
class ExpenseViewModel @Inject constructor(
    private val dao: ExpenseDao,
    private val storage: SecureStorage,
    private val crypto: CryptoManager,
    private val repo: GitHubRepository,
    private val json: Json,
): ViewModel(){
    val expenses: StateFlow<List<ExpenseEntity>> = dao.getAllExpenses().stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
    private val _ui = MutableStateFlow(ExpenseUiState())
    val uiState: StateFlow<ExpenseUiState> = _ui
    init{ pull()}
    private fun pull(){ viewModelScope.launch{
        try{
            val remote=repo.readMergedContent(GitHubRepository.EXPENSES_FILE).getOrNull()
            if(remote!=null && remote!="[]"){
                val list=try{ json.decodeFromString<List<ExpenseSyncData>>(remote)}catch(_:Exception){ emptyList()}
                for(i in list){ if(expenses.value.none{ it.id==i.id}) dao.insert(ExpenseEntity(id=i.id, amount=i.amount, category=i.category, paidBy=i.paidBy, date=i.date, note=i.note, createdBy=i.paidBy, createdAt=i.createdAt)) }
            }
        }catch(_:Exception){}
    }}
    fun add(amount:Double, category:String, note:String){
        viewModelScope.launch{
            val now=LocalDateTime.now().toString()
            dao.insert(ExpenseEntity(id=crypto.generateId(), amount=amount, category=category, paidBy=storage.getUserId()?:"", date=java.time.LocalDate.now().toString(), note=note, createdBy=storage.getUserId()?:"", createdAt=now))
            val r = sync()
            _ui.update{ it.copy(feedback = if(r.isSuccess) TokenOwnership.saved("هزینه") else TokenOwnership.failed(r.exceptionOrNull()))}
        }
    }
    fun isReadOnly(id:String) = repo.isReadOnly(GitHubRepository.EXPENSES_FILE, id)
    fun delete(id:String){ viewModelScope.launch{
        if(isReadOnly(id)){ _ui.update{ it.copy(feedback=TokenOwnership.READ_ONLY)}; return@launch }
        dao.delete(id)
        val r = repo.removeFromList(GitHubRepository.EXPENSES_FILE, id)
        sync()
        _ui.update{ it.copy(feedback = if(r.isSuccess) "حذف شد و از توکن خودت پاک شد ✅" else TokenOwnership.failed(r.exceptionOrNull()))}
    }}
    fun refresh(){ viewModelScope.launch{ _ui.update{ it.copy(refreshing=true)}; pull(); sync(); _ui.update{ it.copy(refreshing=false, feedback="بازخوانی شد ✅ — دیتای پارتنر از توکن خودش خونده شد 👁️")}; kotlinx.coroutines.delay(2000); _ui.update{ it.copy(feedback=null)} } }
    private suspend fun sync(): Result<Unit> {
        return try{
            val remoteStr=repo.readMergedContent(GitHubRepository.EXPENSES_FILE).getOrNull()?:"[]"
            val remote=try{ json.decodeFromString<List<ExpenseSyncData>>(remoteStr)}catch(_:Exception){ emptyList()}
            val local=expenses.value.map{ ExpenseSyncData(it.id,it.amount,it.category,it.paidBy,it.date,it.note,it.createdAt)}
            val merged=mutableMapOf<String, ExpenseSyncData>(); remote.forEach{ merged[it.id]=it}; local.forEach{ merged[it.id]=it}
            repo.saveFullList(GitHubRepository.EXPENSES_FILE, json.encodeToString(merged.values.toList()))
        }catch(e:Exception){ Result.failure(e) }
    }
}
