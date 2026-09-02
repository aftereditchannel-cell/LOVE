package com.coupleos.app.ui.countdown

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
import java.time.temporal.ChronoUnit

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CountdownScreen(vm: CountdownViewModel = hiltViewModel()){
    val items by vm.items.collectAsState()
    val ui by vm.uiState.collectAsState()
    var show by remember{ mutableStateOf(false)}
    Scaffold(containerColor=Background, topBar={ TopAppBar(title={Text("شمارش معکوس ⏱️", color=TextPrimary)}, colors=TopAppBarDefaults.topAppBarColors(containerColor=Surface), actions={ if(ui.refreshing) CircularProgressIndicator(Modifier.size(22.dp), color=Primary, strokeWidth=2.dp) else IconButton(onClick={vm.refresh()}){ Text("⟳", color=Primary, fontSize=18.sp)}})}, floatingActionButton={ FloatingActionButton(onClick={show=true}, containerColor=Primary){ Icon(Icons.Default.Add,null, tint=OnPrimary)}}){ pad->
        Column(Modifier.fillMaxSize().padding(pad).padding(16.dp)){
            if(ui.feedback!=null){ Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=PrimaryContainer), shape=RoundedCornerShape(12.dp)){ Text(ui.feedback!!, Modifier.padding(12.dp), color=TextPrimary)}; Spacer(Modifier.height(12.dp))}
            if(items.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment=Alignment.Center){ Column(horizontalAlignment=Alignment.CenterHorizontally){ Text("⏱️", fontSize=48.sp); Text("شمارشی ثبت نشده", color=TextTertiary); Text("روز مهم بعدی رو اضافه کن — روی توکن میمونه", style=MaterialTheme.typography.bodySmall, color=TextTertiary)}}
            else LazyColumn(verticalArrangement=Arrangement.spacedBy(12.dp)){
                items(items, key={it.id}){ c->
                    val daysLeft = try{ ChronoUnit.DAYS.between(LocalDate.now(), LocalDate.parse(c.targetDate)) } catch(_:Exception){ 0}
                    Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(16.dp)){
                        Row(Modifier.padding(16.dp), verticalAlignment=Alignment.CenterVertically, horizontalArrangement=Arrangement.SpaceBetween){
                            Row(verticalAlignment=Alignment.CenterVertically){
                                Text(c.emoji, fontSize=32.sp)
                                Spacer(Modifier.width(12.dp))
                                Column{
                                    Text(c.title, style=MaterialTheme.typography.titleSmall, color=TextPrimary)
                                    Text(c.targetDate, style=MaterialTheme.typography.labelSmall, color=TextTertiary)
                                    Text(if(daysLeft>=0) "$daysLeft روز مونده" else "${-daysLeft} روز گذشته", style=MaterialTheme.typography.bodySmall, color=Primary)
                                }
                            }
                            if(vm.isReadOnly(c.id)) Text("از توکن پارتنر 👁️", style=MaterialTheme.typography.labelSmall, color=TextTertiary) else TextButton(onClick={ vm.delete(c.id)}){ Text("حذف", color=Danger, fontSize=12.sp)}
                        }
                    }
                }
            }
        }
    }
    if(show){
        var title by remember{ mutableStateOf("")}
        var date by remember{ mutableStateOf("")}
        var emoji by remember{ mutableStateOf("❤️")}
        AlertDialog(onDismissRequest={show=false}, title={Text("شمارش جدید")}, text={
            Column(verticalArrangement=Arrangement.spacedBy(10.dp)){
                OutlinedTextField(value=title, onValueChange={title=it}, label={Text("عنوان (مثلا سالگرد)")}, singleLine=true, modifier=Modifier.fillMaxWidth())
                OutlinedTextField(value=date, onValueChange={date=it}, label={Text("تاریخ YYYY-MM-DD")}, singleLine=true, modifier=Modifier.fillMaxWidth())
                OutlinedTextField(value=emoji, onValueChange={emoji=it}, label={Text("اموجی")}, singleLine=true, modifier=Modifier.fillMaxWidth())
                Text("روی توکن ذخیره و با پارتنر همگام میشه", style=MaterialTheme.typography.labelSmall, color=TextTertiary)
            }
        }, confirmButton={ Button(onClick={ if(title.isNotBlank() && date.isNotBlank()){ vm.add(title,date,emoji); show=false}}, colors=ButtonDefaults.buttonColors(containerColor=Primary)){ Text("افزودن")}}, dismissButton={ TextButton(onClick={show=false}){ Text("انصراف")}})
    }
}
