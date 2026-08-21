package com.coupleos.app.ui.relationship

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.security.keystore.SecureStorage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

data class RelationshipUiState(
    val communication:Int=5, val trust:Int=5, val qualityTime:Int=5, val affection:Int=5, val funScore:Int=5, val support:Int=5,
    val feedback:String?=null, val average:Float=5f, val history:List<String> = emptyList()
)

@HiltViewModel
class RelationshipViewModel @Inject constructor(private val storage: SecureStorage): ViewModel(){
    private val _ui = MutableStateFlow(RelationshipUiState())
    val uiState: StateFlow<RelationshipUiState> = _ui

    fun updateValue(key:String, v:Int){
        _ui.update{
            when(key){
                "communication"-> it.copy(communication=v)
                "trust"-> it.copy(trust=v)
                "qualityTime"-> it.copy(qualityTime=v)
                "affection"-> it.copy(affection=v)
                "funScore"-> it.copy(funScore=v)
                "support"-> it.copy(support=v)
                else-> it
            }.let { s-> s.copy(average=(s.communication+s.trust+s.qualityTime+s.affection+s.funScore+s.support)/6f)}
        }
    }
    fun save(){
        viewModelScope.launch{
            val avg = _ui.value.average
            val msg = when{
                avg>=4.5f -> "رابطه‌تون فوق‌العاده‌ست! ❤️"
                avg>=3.5f -> "خوبه، ولی میتونید بهترش کنید 💪"
                else -> "نیاز به توجه بیشتر داره — با هم صحبت کنید"
            }
            _ui.update{ it.copy(feedback="ثبت شد: $msg (میانگین ${String.format("%.1f", avg)}/5)", history=it.history + "${LocalDate.now()}: ${String.format("%.1f", avg)} $msg")}
        }
    }
}
