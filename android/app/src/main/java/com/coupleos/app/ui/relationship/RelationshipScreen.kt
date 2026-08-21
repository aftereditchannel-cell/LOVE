package com.coupleos.app.ui.relationship

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.coupleos.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RelationshipScreen(vm: RelationshipViewModel = hiltViewModel()){
    val ui by vm.uiState.collectAsState()
    Scaffold(containerColor=Background, topBar={ TopAppBar(title={Text("رابطه ما 💞", color=TextPrimary)}, colors=TopAppBarDefaults.topAppBarColors(containerColor=Surface))}){ pad->
        LazyColumn(Modifier.fillMaxSize().padding(pad).padding(20.dp), verticalArrangement=Arrangement.spacedBy(16.dp)){
            item{
                Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(16.dp)){
                    Column(Modifier.padding(16.dp)){
                        Text("امتیاز کلی: ${String.format("%.1f", ui.average)}/5", style=MaterialTheme.typography.titleMedium, color=Primary)
                        LinearProgressIndicator(progress={ ui.average/5f}, modifier=Modifier.fillMaxWidth().height(8.dp), color=Primary, trackColor=SurfaceElevated)
                        if(ui.feedback!=null){ Spacer(Modifier.height(8.dp)); Text(ui.feedback!!, color=Success, style=MaterialTheme.typography.bodySmall)}
                    }
                }
            }
            item{ SliderCard("ارتباط 💬", ui.communication){ vm.updateValue("communication", it)}}
            item{ SliderCard("اعتماد 🤝", ui.trust){ vm.updateValue("trust", it)}}
            item{ SliderCard("وقت دونفره ⏰", ui.qualityTime){ vm.updateValue("qualityTime", it)}}
            item{ SliderCard("محبت ❤️", ui.affection){ vm.updateValue("affection", it)}}
            item{ SliderCard("خوش گذرونی 🎉", ui.funScore){ vm.updateValue("funScore", it)}}
            item{ SliderCard("حمایت 🛟", ui.support){ vm.updateValue("support", it)}}
            item{ Button(onClick={ vm.save()}, modifier=Modifier.fillMaxWidth(), colors=ButtonDefaults.buttonColors(containerColor=Primary)){ Text("ثبت بررسی")}}
            if(ui.history.isNotEmpty()){
                item{ Text("تاریخچه", style=MaterialTheme.typography.titleSmall, color=TextSecondary)}
                items(ui.history.size){ idx->
                    Card(Modifier.fillMaxWidth().padding(vertical=4.dp), colors=CardDefaults.cardColors(containerColor=SurfaceElevated), shape=RoundedCornerShape(12.dp)){
                        Text(ui.history[idx], Modifier.padding(12.dp), color=TextPrimary)
                    }
                }
            }
            item{ Spacer(Modifier.height(60.dp))}
        }
    }
}
@Composable
private fun SliderCard(title:String, value:Int, onChange:(Int)->Unit){
    Card(colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(16.dp)){
        Column(Modifier.padding(16.dp)){
            Row(Modifier.fillMaxWidth(), horizontalArrangement=Arrangement.SpaceBetween){ Text(title, color=TextPrimary); Text("$value/5", color=Primary)}
            Slider(value=value.toFloat(), onValueChange={ onChange(it.toInt())}, valueRange=1f..5f, steps=3, colors=SliderDefaults.colors(activeTrackColor=Primary))
        }
    }
}
