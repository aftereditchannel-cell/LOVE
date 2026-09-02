package com.coupleos.app.ui.questions

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.DailyQuestionDao
import com.coupleos.app.data.local.entity.DailyQuestionEntity
import com.coupleos.app.data.local.entity.QuestionAnswerEntity
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
import java.time.LocalDate
import javax.inject.Inject

data class QuestionsUiState(val todayQuestion:String?=null, val answers:List<String> = emptyList(), val feedback:String?=null, val refreshing:Boolean=false)
@Serializable data class AnswerSyncData(val id:String, val questionId:String, val userId:String, val answer:String, val createdAt:String)

@HiltViewModel
class QuestionsViewModel @Inject constructor(
    private val dao: DailyQuestionDao,
    private val storage: SecureStorage,
    private val crypto: CryptoManager,
    private val repo: GitHubRepository,
    private val json: Json,
): ViewModel(){
    private val _ui = MutableStateFlow(QuestionsUiState())
    val uiState: StateFlow<QuestionsUiState> = _ui
    private val defaultQuestions = listOf(
        "امروز بیشتر از همه دلت چی می‌خواد؟",
        "کدوم خاطرمون رو هیچ‌وقت فراموش نمی‌کنی؟",
        "اگر همین الان سفر می‌رفتیم کجا می‌رفتیم؟",
        "امروز از چه چیزی ممنونی؟",
        "یک چیز که امروز لبخند رو لبت آورد؟",
        "چه آهنگی الان حالت رو خوب می‌کنه؟",
        "اگر فردا تعطیل بود چیکار می‌کردی؟",
        "بزرگترین آرزومون برای آینده چیه؟",
    )
    init{ loadToday() }
    private fun loadToday(){
        viewModelScope.launch{
            val today = LocalDate.now().toString()
            val q = dao.getQuestionByDate(today)?.question ?: defaultQuestions[LocalDate.now().dayOfYear % defaultQuestions.size].also{
                dao.insert(DailyQuestionEntity(id=crypto.generateId(), question=it, date=today))
            }
            _ui.update{ it.copy(todayQuestion=q)}
            pullAnswers()
        }
    }
    private fun pullAnswers(){
        viewModelScope.launch{
            try{
                val remote=repo.readMergedContent(GitHubRepository.QUESTIONS_FILE).getOrNull()
                if(remote!=null && remote!="[]"){
                    val list=try{ json.decodeFromString<List<AnswerSyncData>>(remote)}catch(_:Exception){ emptyList()}
                    // show answers for display
                    _ui.update{ it.copy(answers=list.map{ "${it.answer} — ${if(it.userId==storage.getUserId()) "تو" else "پارتنر (فقط خواندنی)"}" })}
                }
            }catch(_:Exception){}
        }
    }
    fun answer(text:String){
        viewModelScope.launch{
            val today=LocalDate.now().toString()
            val qId = dao.getQuestionByDate(today)?.id ?: crypto.generateId()
            val ans = QuestionAnswerEntity(id=crypto.generateId(), questionId=qId, userId=storage.getUserId()?:"", answer=text, createdAt=LocalDate.now().toString())
            dao.insertAnswer(ans)
            // sync to gist
            try{
                val remoteStr=repo.readMergedContent(GitHubRepository.QUESTIONS_FILE).getOrNull()?:"[]"
                val remote=try{ json.decodeFromString<List<AnswerSyncData>>(remoteStr)}catch(_:Exception){ emptyList()}
                val newItem=AnswerSyncData(ans.id, qId, ans.userId, text, ans.createdAt)
                val merged = remote.toMutableList().apply{ add(newItem)}
                val r = repo.saveFullList(GitHubRepository.QUESTIONS_FILE, json.encodeToString(merged))
                _ui.update{ it.copy(
                    feedback = if(r.isSuccess) TokenOwnership.saved("پاسخ") else TokenOwnership.failed(r.exceptionOrNull()),
                    answers = merged.map{ "${it.answer} — ${if(it.userId==storage.getUserId()) "تو" else "پارتنر (فقط خواندنی)"}" }
                )}
            }catch(e:Exception){
                _ui.update{ it.copy(feedback=TokenOwnership.failed(e))}
            }
        }
    }
    fun refresh(){ viewModelScope.launch{ _ui.update{ it.copy(refreshing=true)}; loadToday(); kotlinx.coroutines.delay(500); _ui.update{ it.copy(refreshing=false)}}}
}
