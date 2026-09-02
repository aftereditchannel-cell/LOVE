package com.coupleos.app.ui.wishlist

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
fun WishlistScreen(vm: WishlistViewModel = hiltViewModel()){
    val items by vm.items.collectAsState()
    val ui by vm.uiState.collectAsState()
    var show by remember{ mutableStateOf(false)}
    Scaffold(containerColor=Background, topBar={ TopAppBar(title={Text("لیست آرزوها ⭐", color=TextPrimary)}, colors=TopAppBarDefaults.topAppBarColors(containerColor=Surface), actions={ if(ui.refreshing) CircularProgressIndicator(Modifier.size(22.dp), color=Primary, strokeWidth=2.dp) else IconButton(onClick={vm.refresh()}){ Text("⟳", color=Primary, fontSize=18.sp)}})}, floatingActionButton={ FloatingActionButton(onClick={show=true}, containerColor=Primary){ Icon(Icons.Default.Add,null, tint=OnPrimary)}}){ pad->
        Column(Modifier.fillMaxSize().padding(pad).padding(16.dp)){
            if(ui.feedback!=null){ Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=PrimaryContainer), shape=RoundedCornerShape(12.dp)){ Text(ui.feedback!!, Modifier.padding(12.dp), color=TextPrimary)}; Spacer(Modifier.height(12.dp))}
            if(items.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment=Alignment.Center){ Column(horizontalAlignment=Alignment.CenterHorizontally){ Text("⭐", fontSize=48.sp); Text("لیست آرزوها خالیه", color=TextTertiary); Text("چیزی که آرزوشو داری اضافه کن — روی توکن میمونه", style=MaterialTheme.typography.bodySmall, color=TextTertiary) }}
            else LazyColumn(verticalArrangement=Arrangement.spacedBy(10.dp)){
                items(items, key={it.id}){ w->
                    Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(16.dp)){
                        Column(Modifier.padding(16.dp)){
                            Row(Modifier.fillMaxWidth(), horizontalArrangement=Arrangement.SpaceBetween, verticalAlignment=Alignment.CenterVertically){
                                Text(w.title, style=MaterialTheme.typography.titleSmall, color=TextPrimary, modifier=Modifier.weight(1f))
                                Checkbox(checked=w.isCompleted, enabled=!vm.isReadOnly(w.id), onCheckedChange={ vm.toggleComplete(w.id) })
                            }
                            if(w.description.isNotEmpty()){ Spacer(Modifier.height(4.dp)); Text(w.description, style=MaterialTheme.typography.bodySmall, color=TextSecondary)}
                            if(w.category.isNotEmpty()) Text("دسته: ${w.category}", style=MaterialTheme.typography.labelSmall, color=Primary)
                            Spacer(Modifier.height(6.dp))
                            Row(Modifier.fillMaxWidth(), horizontalArrangement=Arrangement.SpaceBetween){
                                Text(if(w.privacy=="PRIVATE") "🔒 خصوصی" else "💞 مشترک", style=MaterialTheme.typography.labelSmall, color=TextTertiary)
                                if(vm.isReadOnly(w.id)) Text("از توکن پارتنر 👁️", style=MaterialTheme.typography.labelSmall, color=TextTertiary) else TextButton(onClick={ vm.delete(w.id) }){ Text("حذف", color=Danger, fontSize=12.sp)}
                            }
                        }
                    }
                }
            }
        }
    }
    if(show){
        var title by remember{ mutableStateOf("")}
        var desc by remember{ mutableStateOf("")}
        var cat by remember{ mutableStateOf("")}
        var privacy by remember{ mutableStateOf("SHARED")}
        AlertDialog(onDismissRequest={show=false}, title={Text("آرزوی جدید")}, text={
            Column(verticalArrangement=Arrangement.spacedBy(10.dp)){
                OutlinedTextField(value=title, onValueChange={title=it}, label={Text("عنوان")}, singleLine=true, modifier=Modifier.fillMaxWidth())
                OutlinedTextField(value=desc, onValueChange={desc=it}, label={Text("توضیح")}, modifier=Modifier.fillMaxWidth())
                OutlinedTextField(value=cat, onValueChange={cat=it}, label={Text("دسته (مثلا سفر، هدیه)")}, singleLine=true, modifier=Modifier.fillMaxWidth())
                Row(horizontalArrangement=Arrangement.spacedBy(8.dp)){
                    FilterChip(selected=privacy=="SHARED", onClick={privacy="SHARED"}, label={Text("💞 مشترک")})
                    FilterChip(selected=privacy=="PRIVATE", onClick={privacy="PRIVATE"}, label={Text("🔒 خصوصی")})
                }
            }
        }, confirmButton={ Button(onClick={ if(title.isNotBlank()){ vm.add(title,desc,cat,privacy); show=false}}, colors=ButtonDefaults.buttonColors(containerColor=Primary)){ Text("افزودن")}}, dismissButton={ TextButton(onClick={show=false}){ Text("انصراف")}})
    }
}
