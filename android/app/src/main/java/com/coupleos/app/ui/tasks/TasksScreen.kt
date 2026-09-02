package com.coupleos.app.ui.tasks

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
fun TasksScreen(viewModel: TasksViewModel = hiltViewModel()){
    val tasks by viewModel.tasks.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    var showDialog by remember{ mutableStateOf(false)}
    var filter by remember{ mutableStateOf("ALL")}

    val filtered = when(filter){
        "TODO" -> tasks.filter{ it.status=="TODO"}
        "DONE" -> tasks.filter{ it.status=="DONE"}
        else -> tasks
    }

    Scaffold(containerColor=Background,
        topBar={ TopAppBar(title={ Text("کارهای دونفره ✅", color=TextPrimary)}, colors=TopAppBarDefaults.topAppBarColors(containerColor=Surface),
            actions={ if(uiState.isRefreshing) CircularProgressIndicator(Modifier.size(24.dp), color=Primary, strokeWidth=2.dp) else IconButton(onClick={viewModel.refresh()}){ Text("⟳", color=Primary, fontSize=18.sp)} })},
        floatingActionButton={ FloatingActionButton(onClick={showDialog=true}, containerColor=Primary){ Icon(Icons.Default.Add,null, tint=OnPrimary)} }
    ){ padding->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp)){
            Row(horizontalArrangement=Arrangement.spacedBy(8.dp)){
                FilterChip(selected=filter=="ALL", onClick={filter="ALL"}, label={Text("همه (${tasks.size})")})
                FilterChip(selected=filter=="TODO", onClick={filter="TODO"}, label={Text("فعال")})
                FilterChip(selected=filter=="DONE", onClick={filter="DONE"}, label={Text("انجام شده")})
            }
            Spacer(Modifier.height(12.dp))
            if(uiState.feedback!=null){ Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=PrimaryContainer), shape=RoundedCornerShape(12.dp)){ Text(uiState.feedback!!, Modifier.padding(12.dp), color=TextPrimary)}; Spacer(Modifier.height(12.dp))}
            if(filtered.isEmpty()){
                Box(Modifier.fillMaxSize(), contentAlignment=Alignment.Center){ Column(horizontalAlignment=Alignment.CenterHorizontally){ Text("✅", fontSize=48.sp); Spacer(Modifier.height(8.dp)); Text("کاری ثبت نشده", color=TextTertiary); Text("اولین کار مشترکتون رو بسازید — روی توکن ذخیره میشه", style=MaterialTheme.typography.bodySmall, color=TextTertiary)}}
            } else {
                LazyColumn(verticalArrangement=Arrangement.spacedBy(12.dp)){
                    items(filtered, key={it.id}){ t->
                        Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(16.dp)){
                            Column(Modifier.padding(16.dp)){
                                Text(t.title, style=MaterialTheme.typography.titleSmall, color=TextPrimary)
                                if(t.description.isNotEmpty()){ Spacer(Modifier.height(4.dp)); Text(t.description, style=MaterialTheme.typography.bodySmall, color=TextSecondary)}
                                Spacer(Modifier.height(8.dp))
                                Row(Modifier.fillMaxWidth(), horizontalArrangement= Arrangement.SpaceBetween, verticalAlignment=Alignment.CenterVertically){
                                    Column{
                                        Text("اولویت: ${t.priority}", style=MaterialTheme.typography.labelSmall, color=TextTertiary)
                                        if(t.dueDate.isNotEmpty()) Text("موعد: ${t.dueDate}", style=MaterialTheme.typography.labelSmall, color=TextTertiary)
                                        Text("مسئول: ${t.assignedTo}", style=MaterialTheme.typography.labelSmall, color=Primary)
                                    }
                                    val readOnly = viewModel.isReadOnly(t.id)
                                    if(readOnly){
                                        Text("از توکن پارتنر 👁️ فقط خواندنی", style=MaterialTheme.typography.labelSmall, color=TextTertiary)
                                    } else Row(horizontalArrangement=Arrangement.spacedBy(4.dp)){
                                        if(t.status!="DONE") Button(onClick={ viewModel.updateStatus(t.id, "DONE") }, colors=ButtonDefaults.buttonColors(containerColor=Success), contentPadding=PaddingValues(horizontal=12.dp, vertical=6.dp)){ Text("انجام شد", fontSize=12.sp)}
                                        else Button(onClick={ viewModel.updateStatus(t.id, "TODO") }, colors=ButtonDefaults.buttonColors(containerColor=TextTertiary), contentPadding=PaddingValues(horizontal=12.dp, vertical=6.dp)){ Text("بازگشایی", fontSize=12.sp)}
                                        TextButton(onClick={ viewModel.deleteTask(t.id)}){ Text("حذف", color=Danger, fontSize=12.sp)}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if(showDialog){
        var title by remember{ mutableStateOf("")}
        var desc by remember{ mutableStateOf("")}
        var due by remember{ mutableStateOf("")}
        var priority by remember{ mutableStateOf("MEDIUM")}
        var assigned by remember{ mutableStateOf("BOTH")}
        AlertDialog(onDismissRequest={showDialog=false}, title={Text("کار جدید")},
            text={
                Column(verticalArrangement=Arrangement.spacedBy(10.dp)){
                    OutlinedTextField(value=title, onValueChange={title=it}, label={Text("عنوان")}, singleLine=true, modifier=Modifier.fillMaxWidth())
                    OutlinedTextField(value=desc, onValueChange={desc=it}, label={Text("توضیح")}, modifier=Modifier.fillMaxWidth())
                    OutlinedTextField(value=due, onValueChange={due=it}, label={Text("موعد (YYYY-MM-DD)")}, singleLine=true, modifier=Modifier.fillMaxWidth())
                    Text("اولویت", style=MaterialTheme.typography.labelSmall, color=TextSecondary)
                    Row(horizontalArrangement=Arrangement.spacedBy(6.dp)){
                        listOf("LOW" to "کم","MEDIUM" to "متوسط","HIGH" to "زیاد").forEach{ (v,l)-> FilterChip(selected=priority==v, onClick={priority=v}, label={Text(l)})}
                    }
                    Text("مسئول", style=MaterialTheme.typography.labelSmall, color=TextSecondary)
                    Row(horizontalArrangement=Arrangement.spacedBy(6.dp)){
                        listOf("BOTH" to "هردو","ME" to "من","PARTNER" to "پارتنر").forEach{ (v,l)-> FilterChip(selected=assigned==v, onClick={assigned=v}, label={Text(l)})}
                    }
                }
            },
            confirmButton={ Button(onClick={ if(title.isNotBlank()){ viewModel.createTask(title,desc,due,priority,assigned); showDialog=false}}, colors=ButtonDefaults.buttonColors(containerColor=Primary)){ Text("افزودن")}},
            dismissButton={ TextButton(onClick={showDialog=false}){ Text("انصراف")}}
        )
    }
}
