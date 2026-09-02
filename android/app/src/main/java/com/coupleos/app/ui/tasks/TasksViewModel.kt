package com.coupleos.app.ui.tasks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.TaskDao
import com.coupleos.app.data.local.entity.TaskEntity
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

data class TasksUiState(val isRefreshing:Boolean=false, val feedback:String?=null)

@Serializable
data class TaskSyncData(val id:String, val title:String, val description:String="", val dueDate:String="", val priority:String="MEDIUM", val assignedTo:String="BOTH", val status:String="TODO", val createdBy:String="", val createdAt:String="")

@HiltViewModel
class TasksViewModel @Inject constructor(
    private val taskDao: TaskDao,
    private val secureStorage: SecureStorage,
    private val cryptoManager: CryptoManager,
    private val gitHubRepository: GitHubRepository,
    private val json: Json,
): ViewModel() {
    val tasks: StateFlow<List<TaskEntity>> = taskDao.getAllTasks().stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
    private val _uiState = MutableStateFlow(TasksUiState())
    val uiState: StateFlow<TasksUiState> = _uiState
    init { pull() }
    private fun pull(){
        viewModelScope.launch{
            try{
                val remote = gitHubRepository.readMergedContent(GitHubRepository.TASKS_FILE).getOrNull()
                if(remote!=null && remote!="[]"){
                    val list = try{ json.decodeFromString<List<TaskSyncData>>(remote)}catch(_:Exception){ emptyList()}
                    for(item in list){
                        if(taskDao.getTaskById(item.id)==null){
                            taskDao.insert(TaskEntity(id=item.id, title=item.title, description=item.description, dueDate=item.dueDate, priority=item.priority, assignedTo=item.assignedTo, status=item.status, createdBy=item.createdBy, createdAt=item.createdAt, updatedAt=item.createdAt, isSynced=true))
                        }
                    }
                }
            }catch(_:Exception){}
        }
    }
    fun createTask(title:String, description:String, dueDate:String, priority:String, assignedTo:String){
        viewModelScope.launch{
            val now=LocalDateTime.now().toString()
            val entity=TaskEntity(id=cryptoManager.generateId(), title=title, description=description, dueDate=dueDate, priority=priority, assignedTo=assignedTo, status="TODO", createdBy=secureStorage.getUserId()?:"", createdAt=now, updatedAt=now, isSynced=false)
            taskDao.insert(entity)
            val r = sync()
            _uiState.update{ it.copy(feedback = if(r.isSuccess) TokenOwnership.saved("کار") else TokenOwnership.failed(r.exceptionOrNull()))}
        }
    }
    fun isReadOnly(id:String) = gitHubRepository.isReadOnly(GitHubRepository.TASKS_FILE, id)

    fun updateStatus(id:String, status:String){
        viewModelScope.launch{
            if(isReadOnly(id)){ _uiState.update{ it.copy(feedback=TokenOwnership.READ_ONLY)}; return@launch }
            taskDao.updateStatus(id, status, LocalDateTime.now().toString())
            val r = sync()
            if(r.isFailure) _uiState.update{ it.copy(feedback=TokenOwnership.failed(r.exceptionOrNull()))}
        }
    }
    fun deleteTask(id:String){
        viewModelScope.launch{
            if(isReadOnly(id)){ _uiState.update{ it.copy(feedback=TokenOwnership.READ_ONLY)}; return@launch }
            taskDao.softDelete(id, LocalDateTime.now().toString())
            val r = gitHubRepository.removeFromList(GitHubRepository.TASKS_FILE, id)
            sync()
            _uiState.update{ it.copy(feedback = if(r.isSuccess) "حذف شد و از توکن خودت پاک شد ✅" else TokenOwnership.failed(r.exceptionOrNull()))}
        }
    }
    fun refresh(){
        viewModelScope.launch{
            _uiState.update{ it.copy(isRefreshing=true)}
            pull()
            sync()
            _uiState.update{ it.copy(isRefreshing=false, feedback="بازخوانی شد ✅ — دیتای پارتنر از توکن خودش خونده شد 👁️")}
            kotlinx.coroutines.delay(2000)
            _uiState.update{ it.copy(feedback=null)}
        }
    }
    private suspend fun sync(): Result<Unit> {
        return try{
            val remoteStr=gitHubRepository.readMergedContent(GitHubRepository.TASKS_FILE).getOrNull()?:"[]"
            val remoteList= try{ json.decodeFromString<List<TaskSyncData>>(remoteStr)}catch(_:Exception){ emptyList()}
            val localList=tasks.value.map{ TaskSyncData(it.id,it.title,it.description,it.dueDate,it.priority,it.assignedTo,it.status,it.createdBy,it.createdAt)}
            val merged=mutableMapOf<String, TaskSyncData>()
            remoteList.forEach{ merged[it.id]=it}
            localList.forEach{ merged[it.id]=it}
            val finalJson=json.encodeToString(merged.values.toList())
            gitHubRepository.saveFullList(GitHubRepository.TASKS_FILE, finalJson)
        }catch(e:Exception){ Result.failure(e) }
    }
    fun clearFeedback(){ _uiState.update{ it.copy(feedback=null)}}
}
