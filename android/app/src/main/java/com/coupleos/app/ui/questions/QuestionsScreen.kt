package com.coupleos.app.ui.questions

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.coupleos.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuestionsScreen(vm: QuestionsViewModel = hiltViewModel()){
    val ui by vm.uiState.collectAsState()
    var answer by remember{ mutableStateOf("")}
    Scaffold(containerColor=Background, topBar={ TopAppBar(title={Text("سؤال روزانه ❓", color=TextPrimary)}, colors=TopAppBarDefaults.topAppBarColors(containerColor=Surface), actions={ if(ui.refreshing) CircularProgressIndicator(Modifier.size(22.dp), color=Primary, strokeWidth=2.dp) else IconButton(onClick={vm.refresh()}){ Text("⟳", color=Primary, fontSize=18.sp)}})}){ pad->
        Column(Modifier.fillMaxSize().padding(pad).padding(20.dp)){
            if(ui.feedback!=null){ Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=PrimaryContainer), shape=RoundedCornerShape(12.dp)){ Text(ui.feedback!!, Modifier.padding(12.dp), color=TextPrimary)}; Spacer(Modifier.height(12.dp))}
            Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(20.dp)){
                Column(Modifier.padding(20.dp), horizontalAlignment=Alignment.CenterHorizontally){
                    Text("سؤال امروز", style=MaterialTheme.typography.labelSmall, color=TextTertiary)
                    Spacer(Modifier.height(12.dp))
                    Text(ui.todayQuestion ?: "در حال بارگذاری...", style=MaterialTheme.typography.titleMedium, color=TextPrimary, textAlign=TextAlign.Center)
                    Spacer(Modifier.height(20.dp))
                    OutlinedTextField(value=answer, onValueChange={answer=it}, label={Text("پاسخت رو بنویس...")}, modifier=Modifier.fillMaxWidth(), minLines=2)
                    Spacer(Modifier.height(12.dp))
                    Button(onClick={ if(answer.isNotBlank()){ vm.answer(answer); answer="" }}, modifier=Modifier.fillMaxWidth(), colors=ButtonDefaults.buttonColors(containerColor=Primary)){ Text("ثبت پاسخ")}
                    Text("پاسخ‌ها روی توکن دونفره ذخیره میشن و هر دو میبینید", style=MaterialTheme.typography.labelSmall, color=TextTertiary, textAlign=TextAlign.Center, modifier=Modifier.padding(top=8.dp))
                }
            }
            Spacer(Modifier.height(16.dp))
            Text("پاسخ‌ها", style=MaterialTheme.typography.titleSmall, color=TextSecondary)
            Spacer(Modifier.height(8.dp))
            if(ui.answers.isEmpty()) Box(Modifier.fillMaxWidth().padding(20.dp), contentAlignment=Alignment.Center){ Text("هنوز پاسخی ثبت نشده", color=TextTertiary)}
            else LazyColumn(verticalArrangement=Arrangement.spacedBy(8.dp)){
                items(ui.answers){ a->
                    Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(12.dp)){
                        Text(a, Modifier.padding(12.dp), color=TextPrimary)
                    }
                }
            }
        }
    }
}
