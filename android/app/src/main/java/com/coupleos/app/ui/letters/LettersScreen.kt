package com.coupleos.app.ui.letters

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.coupleos.app.ui.theme.*
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LettersScreen(vm: LettersViewModel = hiltViewModel()){
    val sent by vm.sent.collectAsState()
    val received by vm.received.collectAsState()
    val ui by vm.uiState.collectAsState()
    var show by remember{ mutableStateOf(false)}
    var tab by remember{ mutableStateOf(0)} // 0 received, 1 sent
    Scaffold(containerColor=Background, topBar={ TopAppBar(title={Text("نامه‌های عاشقانه 💌", color=TextPrimary)}, colors=TopAppBarDefaults.topAppBarColors(containerColor=Surface), actions={ if(ui.refreshing) CircularProgressIndicator(Modifier.size(22.dp), color=Primary, strokeWidth=2.dp) else IconButton(onClick={vm.refresh()}){ Text("⟳", color=Primary, fontSize=18.sp)}})}, floatingActionButton={ FloatingActionButton(onClick={show=true}, containerColor=Primary){ Icon(Icons.Default.Add,null, tint=OnPrimary)}}){ pad->
        Column(Modifier.fillMaxSize().padding(pad).padding(16.dp)){
            if(ui.feedback!=null){ Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=PrimaryContainer), shape=RoundedCornerShape(12.dp)){ Text(ui.feedback!!, Modifier.padding(12.dp), color=TextPrimary)}; Spacer(Modifier.height(12.dp))}
            TabRow(selectedTabIndex=tab, containerColor=Surface, contentColor=Primary){
                Tab(selected=tab==0, onClick={tab=0}, text={Text("دریافتی (${received.size})")})
                Tab(selected=tab==1, onClick={tab=1}, text={Text("ارسالی (${sent.size})")})
            }
            Spacer(Modifier.height(12.dp))
            val list = if(tab==0) received else sent
            if(list.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment=Alignment.Center){ Column(horizontalAlignment=Alignment.CenterHorizontally){ Text("💌", fontSize=48.sp); Text(if(tab==0) "نامه‌ای دریافت نکردی" else "هنوز نامه‌ای نفرستادی", color=TextTertiary); Text("نامه زمان‌دار بنویس — روی توکن تا روز موعود میمونه", style=MaterialTheme.typography.bodySmall, color=TextTertiary)}}
            else LazyColumn(verticalArrangement=Arrangement.spacedBy(10.dp)){
                items(list, key={it.id}){ l->
                    val isLocked = l.openOnDate.isNotEmpty() && !l.isOpened && try{ LocalDate.parse(l.openOnDate).isAfter(LocalDate.now()) }catch(_:Exception){false}
                    Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=if(isLocked) SurfaceElevated else Surface), shape=RoundedCornerShape(16.dp)){
                        Column(Modifier.padding(16.dp)){
                            Text(l.title, style=MaterialTheme.typography.titleSmall, color=TextPrimary)
                            if(isLocked){
                                Spacer(Modifier.height(8.dp))
                                Text("🔒 تا ${l.openOnDate} قفل است — سورپرایز!", style=MaterialTheme.typography.bodySmall, color=Primary)
                                Button(onClick={ vm.openLetter(l.id)}, colors=ButtonDefaults.buttonColors(containerColor=Primary), modifier=Modifier.fillMaxWidth().padding(top=8.dp)){ Text("باز کردن (اگر روزش رسیده)")}
                            } else {
                                Spacer(Modifier.height(6.dp))
                                Text(l.content, style=MaterialTheme.typography.bodyMedium, color=TextSecondary)
                                if(l.openOnDate.isNotEmpty()) Text("بازگشایی: ${l.openOnDate}", style=MaterialTheme.typography.labelSmall, color=TextTertiary)
                                Text(l.createdAt.take(10), style=MaterialTheme.typography.labelSmall, color=TextTertiary)
                            }
                        }
                    }
                }
            }
        }
    }
    if(show){
        var title by remember{ mutableStateOf("")}
        var content by remember{ mutableStateOf("")}
        var openDate by remember{ mutableStateOf("")}
        AlertDialog(onDismissRequest={show=false}, title={Text("نامه جدید 💌")}, text={
            Column(verticalArrangement=Arrangement.spacedBy(10.dp)){
                OutlinedTextField(value=title, onValueChange={title=it}, label={Text("عنوان")}, singleLine=true, modifier=Modifier.fillMaxWidth())
                OutlinedTextField(value=content, onValueChange={content=it}, label={Text("متن عاشقانه")}, minLines=3, modifier=Modifier.fillMaxWidth())
                OutlinedTextField(value=openDate, onValueChange={openDate=it}, label={Text("تاریخ بازگشایی (اختیاری YYYY-MM-DD)")}, singleLine=true, modifier=Modifier.fillMaxWidth())
                Text("زمان‌دار: اگر تاریخ بذاری، پارتنرت فقط اون روز میتونه بازش کنه — روی توکن قفل میمونه", style=MaterialTheme.typography.labelSmall, color=TextTertiary)
            }
        }, confirmButton={ Button(onClick={ if(title.isNotBlank() && content.isNotBlank()){ vm.send(title,content,openDate); show=false}}, colors=ButtonDefaults.buttonColors(containerColor=Primary)){ Text("ارسال")}}, dismissButton={ TextButton(onClick={show=false}){ Text("انصراف")}})
    }
}
