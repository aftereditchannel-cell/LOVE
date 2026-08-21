package com.coupleos.app.ui.ai

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.coupleos.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AIScreen(){
    var prompt by remember{ mutableStateOf("")}
    var response by remember{ mutableStateOf<String?>(null)}
    Scaffold(containerColor=Background, topBar={ TopAppBar(title={Text("دستیار هوشمند 🤖", color=TextPrimary)}, colors=TopAppBarDefaults.topAppBarColors(containerColor=Surface))}){ pad->
        Column(Modifier.fillMaxSize().padding(pad).verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement=Arrangement.spacedBy(16.dp)){
            Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(16.dp)){
                Column(Modifier.padding(16.dp), verticalArrangement=Arrangement.spacedBy(8.dp)){
                    Text("ایده بگیر ✨", style=MaterialTheme.typography.titleSmall, color=Primary)
                    Text("مثلا: «برای سالگرد چی کادو بگیرم؟» یا «یک نامه عاشقانه بنویس»", style=MaterialTheme.typography.bodySmall, color=TextTertiary)
                    OutlinedTextField(value=prompt, onValueChange={prompt=it}, label={Text("پیامت رو بنویس...")}, modifier=Modifier.fillMaxWidth(), minLines=2)
                    Button(onClick={
                        response = when{
                            prompt.contains("کادو") || prompt.contains("هدیه") -> "💡 پیشنهاد: یک آلبوم عکس دست‌ساز از خاطراتتون + یک نامه زمان‌دار برای سالگرد! روی توکن ذخیره‌اش کن."
                            prompt.contains("نامه") -> "💌 متن پیشنهادی: «عزیزترینم، هر روز با تو دنیای کوچیکمون قشنگ‌تر میشه...» — اضافش کن به نامه‌ها!"
                            prompt.contains("قرار") || prompt.contains("دیت") -> "🍝 ایده قرار: شام خونگی با شمع + فیلم مورد علاقه‌تون — تو تقویم ثبتش کن!"
                            prompt.isBlank() -> "یک پیام بنویس تا کمکت کنم ❤️"
                            else -> "❤️ پیشنهاد من: امروز حال پارتنرت رو بپرس، یک خاطره جدید ثبت کن و یک سوال روزانه جواب بده — همه‌ش روی توکن میمونه!"
                        }
                    }, modifier=Modifier.fillMaxWidth(), colors=ButtonDefaults.buttonColors(containerColor=Primary)){ Text("ارسال")}
                    if(response!=null){
                        Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=PrimaryContainer), shape=RoundedCornerShape(12.dp)){ Text(response!!, Modifier.padding(12.dp), color=TextPrimary)}
                    }
                }
            }
            Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(16.dp)){
                Column(Modifier.padding(16.dp)){
                    Text("قابلیت‌ها", style=MaterialTheme.typography.titleSmall, color=TextPrimary)
                    Spacer(Modifier.height(8.dp))
                    Text("• پیشنهاد کادو بر اساس آرزوها", style=MaterialTheme.typography.bodySmall, color=TextSecondary)
                    Text("• نوشتن نامه عاشقانه", style=MaterialTheme.typography.bodySmall, color=TextSecondary)
                    Text("• ایده برای قرار عاشقانه", style=MaterialTheme.typography.bodySmall, color=TextSecondary)
                    Text("• تحلیل حال روزانه", style=MaterialTheme.typography.bodySmall, color=TextSecondary)
                    Text("همه پیشنهادها بعداً به بخش مربوطه لینک میشن.", style=MaterialTheme.typography.labelSmall, color=TextTertiary)
                }
            }
        }
    }
}
