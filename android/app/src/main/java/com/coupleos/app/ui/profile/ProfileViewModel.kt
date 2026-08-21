package com.coupleos.app.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleos.app.data.local.dao.UserDao
import com.coupleos.app.data.local.entity.UserEntity
import com.coupleos.app.data.remote.api.CoupleOSApi
import com.coupleos.app.security.keystore.SecureStorage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import javax.inject.Inject

data class ProfileUiState(
    val name:String="", val nickname:String="", val birthday:String="", val favoriteColor:String="", val favoriteThings:String="", val loveLanguage:String="",
    val coupleName:String="", val startDate:String="", val anniversary:String="", val favoritePlace:String="", val favoriteSong:String="", val ourStory:String="",
    val feedback:String?=null, val loading:Boolean=false
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val storage: SecureStorage,
    private val api: CoupleOSApi,
    private val userDao: UserDao
): ViewModel(){
    private val _ui = MutableStateFlow(ProfileUiState(
        name=storage.getCurrentUserName(),
        coupleName=storage.getPartnerName()
    ))
    val uiState: StateFlow<ProfileUiState> = _ui

    init{ load()}

    private fun load(){
        viewModelScope.launch{
            try{
                val prof = api.getProfile()
                if(prof.isSuccessful && prof.body()!=null){
                    val p=prof.body()!!
                    _ui.update{ it.copy(name=p.name, nickname=p.nickname, birthday=p.birthday, favoriteColor=p.favoriteColor, favoriteThings=p.favoriteThings, loveLanguage=p.loveLanguage)}
                }
                val couple = api.getCouple()
                if(couple.isSuccessful && couple.body()!=null){
                    val c=couple.body()!!
                    _ui.update{ it.copy(coupleName=c.name, startDate=c.startDate, anniversary=c.anniversary, favoritePlace=c.favoritePlace, favoriteSong=c.favoriteSong, ourStory=c.ourStory)}
                }
            }catch(_:Exception){
                // fallback local
            }
            // Also load from secure storage names
            _ui.update{ it.copy(name=storage.getCurrentUserName())}
        }
    }

    fun updateField(key:String, value:String){
        _ui.update{
            when(key){
                "name"-> it.copy(name=value)
                "nickname"-> it.copy(nickname=value)
                "birthday"-> it.copy(birthday=value)
                "favoriteColor"-> it.copy(favoriteColor=value)
                "favoriteThings"-> it.copy(favoriteThings=value)
                "loveLanguage"-> it.copy(loveLanguage=value)
                "coupleName"-> it.copy(coupleName=value)
                "startDate"-> it.copy(startDate=value)
                "anniversary"-> it.copy(anniversary=value)
                "favoritePlace"-> it.copy(favoritePlace=value)
                "favoriteSong"-> it.copy(favoriteSong=value)
                "ourStory"-> it.copy(ourStory=value)
                else-> it
            }
        }
    }

    fun save(){
        viewModelScope.launch{
            _ui.update{ it.copy(loading=true)}
            try{
                val s=_ui.value
                api.updateProfile(com.coupleos.app.data.remote.dto.UpdateProfileRequest(name=s.name, nickname=s.nickname, birthday=s.birthday, favoriteColor=s.favoriteColor, favoriteThings=s.favoriteThings, loveLanguage=s.loveLanguage))
                api.updateCouple(com.coupleos.app.data.remote.dto.UpdateCoupleRequest(name=s.coupleName, startDate=s.startDate, anniversary=s.anniversary, favoritePlace=s.favoritePlace, favoriteSong=s.favoriteSong, ourStory=s.ourStory))
                // also save locally names
                if(storage.getUserRole()=="PERSON_A") storage.savePersonAName(s.name) else storage.savePersonBName(s.name)
                _ui.update{ it.copy(loading=false, feedback="ذخیره شد ✅ — روی سرور و توکن ثبت شد")}
            }catch(e:Exception){
                // still save locally
                val s=_ui.value
                if(storage.getUserRole()=="PERSON_A") storage.savePersonAName(s.name) else storage.savePersonBName(s.name)
                _ui.update{ it.copy(loading=false, feedback="ذخیره محلی شد — سرور در دسترس نبود: ${e.message}")}
            }
        }
    }
}
