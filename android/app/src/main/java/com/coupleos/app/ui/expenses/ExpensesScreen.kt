package com.coupleos.app.ui.expenses

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
fun ExpensesScreen(vm: ExpenseViewModel = hiltViewModel()){
    val list by vm.expenses.collectAsState()
    val ui by vm.uiState.collectAsState()
    var show by remember{ mutableStateOf(false)}
    val total = list.sumOf{ it.amount}
    Scaffold(containerColor=Background, topBar={ TopAppBar(title={Text("هزینه‌های مشترک 💰", color=TextPrimary)}, colors=TopAppBarDefaults.topAppBarColors(containerColor=Surface), actions={ if(ui.refreshing) CircularProgressIndicator(Modifier.size(22.dp), color=Primary, strokeWidth=2.dp) else IconButton(onClick={vm.refresh()}){ Text("⟳", color=Primary, fontSize=18.sp)}})}, floatingActionButton={ FloatingActionButton(onClick={show=true}, containerColor=Primary){ Icon(Icons.Default.Add,null, tint=OnPrimary)}}){ pad->
        Column(Modifier.fillMaxSize().padding(pad).padding(16.dp)){
            Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(16.dp)){ Column(Modifier.padding(16.dp)){ Text("جمع کل", style=MaterialTheme.typography.labelSmall, color=TextTertiary); Text("${total.toInt()} تومان", style=MaterialTheme.typography.headlineSmall, color=Primary)}}
            Spacer(Modifier.height(12.dp))
            if(ui.feedback!=null){ Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=PrimaryContainer), shape=RoundedCornerShape(12.dp)){ Text(ui.feedback!!, Modifier.padding(12.dp), color=TextPrimary)}; Spacer(Modifier.height(12.dp))}
            if(list.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment=Alignment.Center){ Column(horizontalAlignment=Alignment.CenterHorizontally){ Text("💰", fontSize=48.sp); Text("هزینه‌ای ثبت نشده", color=TextTertiary)}}
            else LazyColumn(verticalArrangement=Arrangement.spacedBy(10.dp)){
                items(list, key={it.id}){ e->
                    Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(16.dp)){
                        Row(Modifier.padding(16.dp), horizontalArrangement=Arrangement.SpaceBetween, verticalAlignment=Alignment.CenterVertically){
                            Column{
                                Text(e.category.ifEmpty{ "سایر"} + " — ${e.amount.toInt()} تومان", style=MaterialTheme.typography.titleSmall, color=TextPrimary)
                                Text(e.date + if(e.note.isNotEmpty()) " • ${e.note}" else "", style=MaterialTheme.typography.labelSmall, color=TextTertiary)
                            }
                            TextButton(onClick={ vm.delete(e.id)}){ Text("حذف", color=Danger, fontSize=12.sp)}
                        }
                    }
                }
            }
        }
    }
    if(show){
        var amount by remember{ mutableStateOf("")}
        var cat by remember{ mutableStateOf("")}
        var note by remember{ mutableStateOf("")}
        AlertDialog(onDismissRequest={show=false}, title={Text("هزینه جدید")}, text={
            Column(verticalArrangement=Arrangement.spacedBy(10.dp)){
                OutlinedTextField(value=amount, onValueChange={amount=it}, label={Text("مبلغ (تومان)")}, singleLine=true, modifier=Modifier.fillMaxWidth())
                OutlinedTextField(value=cat, onValueChange={cat=it}, label={Text("دسته (غذا، تفریح...)")}, singleLine=true, modifier=Modifier.fillMaxWidth())
                OutlinedTextField(value=note, onValueChange={note=it}, label={Text("یادداشت")}, modifier=Modifier.fillMaxWidth())
                Text("روی توکن ذخیره میشه", style=MaterialTheme.typography.labelSmall, color=TextTertiary)
            }
        }, confirmButton={ Button(onClick={ val a=amount.toDoubleOrNull() ?: 0.0; if(a>0){ vm.add(a,cat,note); show=false}}, colors=ButtonDefaults.buttonColors(containerColor=Primary)){ Text("افزودن")}}, dismissButton={ TextButton(onClick={show=false}){ Text("انصراف")}})
    }
}
