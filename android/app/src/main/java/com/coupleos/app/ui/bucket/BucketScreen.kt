package com.coupleos.app.ui.bucket

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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.coupleos.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BucketScreen(vm: BucketViewModel = hiltViewModel()){
    val items by vm.items.collectAsState()
    val ui by vm.uiState.collectAsState()
    var show by remember{ mutableStateOf(false)}
    val doneCount = items.count{ it.isCompleted}
    Scaffold(containerColor=Background, topBar={ TopAppBar(title={Column{ Text("لیست خواسته‌ها 🎯", color=TextPrimary); if(items.isNotEmpty()) Text("$doneCount از ${items.size} انجام شده", style=MaterialTheme.typography.labelSmall, color=TextTertiary)}}, colors=TopAppBarDefaults.topAppBarColors(containerColor=Surface), actions={ if(ui.refreshing) CircularProgressIndicator(Modifier.size(22.dp), color=Primary, strokeWidth=2.dp) else IconButton(onClick={vm.refresh()}){ Text("⟳", color=Primary, fontSize=18.sp)}})}, floatingActionButton={ FloatingActionButton(onClick={show=true}, containerColor=Primary){ Icon(Icons.Default.Add,null, tint=OnPrimary)}}){ pad->
        Column(Modifier.fillMaxSize().padding(pad).padding(16.dp)){
            if(ui.feedback!=null){ Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=PrimaryContainer), shape=RoundedCornerShape(12.dp)){ Text(ui.feedback!!, Modifier.padding(12.dp), color=TextPrimary)}; Spacer(Modifier.height(12.dp))}
            if(items.isNotEmpty()){ LinearProgressIndicator(progress=doneCount.toFloat()/items.size.coerceAtLeast(1).toFloat(), modifier=Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)), color=Primary, trackColor=SurfaceElevated); Spacer(Modifier.height(16.dp))}
            if(items.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment=Alignment.Center){ Column(horizontalAlignment=Alignment.CenterHorizontally){ Text("🎯", fontSize=48.sp); Text("هنوز موردی اضافه نکردید", color=TextTertiary); Text("رویاهاتون رو اینجا بنویسید — با توکن بین شما میمونه", style=MaterialTheme.typography.bodySmall, color=TextTertiary)}}
            else LazyColumn(verticalArrangement=Arrangement.spacedBy(10.dp)){
                items(items, key={it.id}){ b->
                    Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=if(b.isCompleted) PrimaryContainer else Surface), shape=RoundedCornerShape(16.dp)){
                        Row(Modifier.padding(16.dp), verticalAlignment=Alignment.CenterVertically){
                            Checkbox(checked=b.isCompleted, onCheckedChange={ vm.toggle(b.id)})
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)){
                                Text(b.title, style=MaterialTheme.typography.titleSmall, color=TextPrimary)
                                if(b.description.isNotEmpty()) Text(b.description, style=MaterialTheme.typography.bodySmall, color=TextSecondary)
                                if(b.isCompleted && b.completedDate.isNotEmpty()) Text("✓ انجام شده: ${b.completedDate}", style=MaterialTheme.typography.labelSmall, color=Success)
                            }
                            TextButton(onClick={ vm.delete(b.id)}){ Text("حذف", color=Danger, fontSize=12.sp)}
                        }
                    }
                }
            }
        }
    }
    if(show){
        var title by remember{ mutableStateOf("")}
        var desc by remember{ mutableStateOf("")}
        AlertDialog(onDismissRequest={show=false}, title={Text("خواسته جدید")}, text={
            Column(verticalArrangement=Arrangement.spacedBy(10.dp)){
                OutlinedTextField(value=title, onValueChange={title=it}, label={Text("عنوان (مثلا سفر به شمال)")}, singleLine=true, modifier=Modifier.fillMaxWidth())
                OutlinedTextField(value=desc, onValueChange={desc=it}, label={Text("توضیح")}, modifier=Modifier.fillMaxWidth())
                Text("روی توکن دونفره ذخیره میشه", style=MaterialTheme.typography.labelSmall, color=TextTertiary)
            }
        }, confirmButton={ Button(onClick={ if(title.isNotBlank()){ vm.add(title,desc); show=false}}, colors=ButtonDefaults.buttonColors(containerColor=Primary)){ Text("افزودن")}}, dismissButton={ TextButton(onClick={show=false}){ Text("انصراف")}})
    }
}
