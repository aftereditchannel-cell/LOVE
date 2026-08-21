package com.coupleos.app.ui.profile

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.coupleos.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(vm: ProfileViewModel = hiltViewModel()){
    val ui by vm.uiState.collectAsState()
    Scaffold(containerColor=Background, topBar={ TopAppBar(title={Text("پروفایل من 👤", color=TextPrimary)}, colors=TopAppBarDefaults.topAppBarColors(containerColor=Surface))}){ pad->
        Column(Modifier.fillMaxSize().padding(pad).verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement=Arrangement.spacedBy(12.dp)){
            if(ui.feedback!=null){ Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=PrimaryContainer), shape=RoundedCornerShape(12.dp)){ Text(ui.feedback!!, Modifier.padding(12.dp), color=TextPrimary)}}
            Text("اطلاعات شخصی", style=MaterialTheme.typography.titleSmall, color=Primary)
            OutlinedTextField(value=ui.name, onValueChange={ vm.updateField("name", it)}, label={Text("نام")}, modifier=Modifier.fillMaxWidth())
            OutlinedTextField(value=ui.nickname, onValueChange={ vm.updateField("nickname", it)}, label={Text("لقب")}, modifier=Modifier.fillMaxWidth())
            OutlinedTextField(value=ui.birthday, onValueChange={ vm.updateField("birthday", it)}, label={Text("تولد YYYY-MM-DD")}, modifier=Modifier.fillMaxWidth())
            OutlinedTextField(value=ui.favoriteColor, onValueChange={ vm.updateField("favoriteColor", it)}, label={Text("رنگ مورد علاقه")}, modifier=Modifier.fillMaxWidth())
            OutlinedTextField(value=ui.favoriteThings, onValueChange={ vm.updateField("favoriteThings", it)}, label={Text("چیزای مورد علاقه")}, modifier=Modifier.fillMaxWidth())
            OutlinedTextField(value=ui.loveLanguage, onValueChange={ vm.updateField("loveLanguage", it)}, label={Text("زبان عشق")}, modifier=Modifier.fillMaxWidth())
            Spacer(Modifier.height(8.dp))
            Text("دنیای ما", style=MaterialTheme.typography.titleSmall, color=Primary)
            OutlinedTextField(value=ui.coupleName, onValueChange={ vm.updateField("coupleName", it)}, label={Text("اسم دونفره")}, modifier=Modifier.fillMaxWidth())
            OutlinedTextField(value=ui.startDate, onValueChange={ vm.updateField("startDate", it)}, label={Text("تاریخ شروع رابطه")}, modifier=Modifier.fillMaxWidth())
            OutlinedTextField(value=ui.anniversary, onValueChange={ vm.updateField("anniversary", it)}, label={Text("سالگرد")}, modifier=Modifier.fillMaxWidth())
            OutlinedTextField(value=ui.favoritePlace, onValueChange={ vm.updateField("favoritePlace", it)}, label={Text("مکان مورد علاقه")}, modifier=Modifier.fillMaxWidth())
            OutlinedTextField(value=ui.favoriteSong, onValueChange={ vm.updateField("favoriteSong", it)}, label={Text("آهنگ دونفره")}, modifier=Modifier.fillMaxWidth())
            OutlinedTextField(value=ui.ourStory, onValueChange={ vm.updateField("ourStory", it)}, label={Text("داستان ما")}, minLines=3, modifier=Modifier.fillMaxWidth())
            Button(onClick={ vm.save()}, modifier=Modifier.fillMaxWidth(), colors=ButtonDefaults.buttonColors(containerColor=Primary), enabled=!ui.loading){
                if(ui.loading) CircularProgressIndicator(Modifier.size(18.dp), color=OnPrimary, strokeWidth=2.dp) else Text("ذخیره — روی توکن و سرور ثبت میشه")
            }
            Spacer(Modifier.height(60.dp))
        }
    }
}
