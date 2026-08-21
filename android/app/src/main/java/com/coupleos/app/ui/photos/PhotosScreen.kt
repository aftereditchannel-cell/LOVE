package com.coupleos.app.ui.photos

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.coupleos.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PhotosScreen(){
    Scaffold(containerColor=Background, topBar={ TopAppBar(title={Text("عکس‌های ما 📸", color=TextPrimary)}, colors=TopAppBarDefaults.topAppBarColors(containerColor=Surface))}){ pad->
        Column(Modifier.fillMaxSize().padding(pad).padding(20.dp)){
            Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=PrimaryContainer), shape=RoundedCornerShape(16.dp)){
                Column(Modifier.padding(16.dp)){
                    Text("ذخیره روی Google Drive + توکن", style=MaterialTheme.typography.titleSmall, color=Primary)
                    Spacer(Modifier.height(6.dp))
                    Text("عکس‌ها هم در حافظه لوکال و هم (در صورت اتصال) در Google Drive و به صورت لینک در Gist ذخیره میشن. فعلاً می‌تونی از بخش خاطرات عکس اضافه کنی — این بخش به زودی گالری کامل میشه.", style=MaterialTheme.typography.bodySmall, color=TextSecondary)
                }
            }
            Spacer(Modifier.height(16.dp))
            Box(Modifier.fillMaxSize(), contentAlignment=Alignment.Center){
                Column(horizontalAlignment=Alignment.CenterHorizontally){
                    Text("📸", fontSize=64.sp)
                    Spacer(Modifier.height(12.dp))
                    Text("گالری به زودی", color=TextTertiary)
                    Text("عکس‌هایتان در خاطرات ذخیره می‌شوند", style=MaterialTheme.typography.labelSmall, color=TextTertiary)
                }
            }
        }
    }
}
