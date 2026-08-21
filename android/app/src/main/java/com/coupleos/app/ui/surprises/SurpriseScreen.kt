package com.coupleos.app.ui.surprises

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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SurpriseScreen(vm: SurpriseViewModel = hiltViewModel()){
    val mine by vm.mine.collectAsState()
    val forMe by vm.forMe.collectAsState()
    val ui by vm.uiState.collectAsState()
    var show by remember{ mutableStateOf(false)}
    var tab by remember{ mutableStateOf(0)}
    Scaffold(containerColor=Background, topBar={ TopAppBar(title={Text("سورپرایزها 🎁", color=TextPrimary)}, colors=TopAppBarDefaults.topAppBarColors(containerColor=Surface), actions={ if(ui.refreshing) CircularProgressIndicator(Modifier.size(22.dp), color=Primary, strokeWidth=2.dp) else IconButton(onClick={vm.refresh()}){ Text("⟳", color=Primary, fontSize=18.sp)}})}, floatingActionButton={ FloatingActionButton(onClick={show=true}, containerColor=Primary){ Icon(Icons.Default.Add,null, tint=OnPrimary)}}){ pad->
        Column(Modifier.fillMaxSize().padding(pad).padding(16.dp)){
            if(ui.feedback!=null){ Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=PrimaryContainer), shape=RoundedCornerShape(12.dp)){ Text(ui.feedback!!, Modifier.padding(12.dp), color=TextPrimary)}; Spacer(Modifier.height(12.dp))}
            TabRow(selectedTabIndex=tab, containerColor=Surface){
                Tab(selected=tab==0, onClick={tab=0}, text={Text("برام (${forMe.size})")})
                Tab(selected=tab==1, onClick={tab=1}, text={Text("ساخته‌ام (${mine.size})")})
            }
            Spacer(Modifier.height(12.dp))
            val list = if(tab==0) forMe else mine
            if(list.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment=Alignment.Center){ Column(horizontalAlignment=Alignment.CenterHorizontally){ Text("🎁", fontSize=48.sp); Text(if(tab==0) "سورپرایزی نداری" else "هنوز سورپرایزی نساختی", color=TextTertiary)}}
            else LazyColumn(verticalArrangement=Arrangement.spacedBy(10.dp)){
                items(list, key={it.id}){ s->
                    Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(16.dp)){
                        Column(Modifier.padding(16.dp)){
                            Text(s.title, style=MaterialTheme.typography.titleSmall, color=TextPrimary)
                            Spacer(Modifier.height(6.dp))
                            if(s.isRevealed) Text(s.content, style=MaterialTheme.typography.bodyMedium, color=TextSecondary)
                            else{
                                Text("🎀 محتوای مخفی — روی باز کردن بزن!", style=MaterialTheme.typography.bodySmall, color=Primary)
                                Button(onClick={ vm.reveal(s.id)}, modifier=Modifier.fillMaxWidth().padding(top=8.dp), colors=ButtonDefaults.buttonColors(containerColor=Primary)){ Text("باز کردن سورپرایز")}
                            }
                            if(s.triggerType.isNotEmpty()) Text("محرک: ${s.triggerType}", style=MaterialTheme.typography.labelSmall, color=TextTertiary)
                        }
                    }
                }
            }
        }
    }
    if(show){
        var title by remember{ mutableStateOf("")}
        var content by remember{ mutableStateOf("")}
        var trigger by remember{ mutableStateOf("")}
        AlertDialog(onDismissRequest={show=false}, title={Text("سورپرایز جدید")}, text={
            Column(verticalArrangement=Arrangement.spacedBy(10.dp)){
                OutlinedTextField(value=title, onValueChange={title=it}, label={Text("عنوان")}, singleLine=true, modifier=Modifier.fillMaxWidth())
                OutlinedTextField(value=content, onValueChange={content=it}, label={Text("محتوا")}, minLines=2, modifier=Modifier.fillMaxWidth())
                OutlinedTextField(value=trigger, onValueChange={trigger=it}, label={Text("شرط نمایش (مثلا تاریخ)")}, singleLine=true, modifier=Modifier.fillMaxWidth())
                Text("روی توکن ذخیره میشه", style=MaterialTheme.typography.labelSmall, color=TextTertiary)
            }
        }, confirmButton={ Button(onClick={ if(title.isNotBlank() && content.isNotBlank()){ vm.create(title,content,trigger); show=false}}, colors=ButtonDefaults.buttonColors(containerColor=Primary)){ Text("ساخت")}}, dismissButton={ TextButton(onClick={show=false}){ Text("انصراف")}})
    }
}
