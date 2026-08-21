package com.coupleos.app.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import com.coupleos.app.data.repository.GitHubRepository
import com.coupleos.app.security.keystore.SecureStorage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import androidx.lifecycle.viewModelScope
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val storage: SecureStorage,
    private val repo: GitHubRepository
): ViewModel(){
    private val _ui = MutableStateFlow(SettingsState(
        myTokenMasked = storage.getMaskedPersonalToken(),
        partnerTokenMasked = storage.getMaskedPartnerToken(),
        myUsername = storage.getMyGitHubUsername() ?: "",
        partnerUsername = storage.getPartnerGitHubUsername() ?: "",
        gistSyncEnabled = storage.isGistSyncEnabled()
    ))
    val uiState: StateFlow<SettingsState> = _ui
    data class SettingsState(
        val myTokenMasked:String="",
        val partnerTokenMasked:String="",
        val myUsername:String="",
        val partnerUsername:String="",
        val gistSyncEnabled:Boolean=true,
        val feedback:String?=null,
        val checking:Boolean=false,
        val myConnected:Boolean?=null,
        val partnerConnected:Boolean?=null
    )
    fun checkConnection(){
        viewModelScope.launch{
            _ui.update{ it.copy(checking=true)}
            val status = repo.checkConnection()
            _ui.update{ it.copy(checking=false, myConnected=status.myConnected, partnerConnected=status.partnerConnected, feedback= status.error ?: "هر دو توکن متصل ✅ — دیتا روی توکن ثبت میشه")}
        }
    }
    fun toggleGistSync(enabled:Boolean){
        storage.setGistSyncEnabled(enabled)
        _ui.update{ it.copy(gistSyncEnabled=enabled, feedback= if(enabled) "همگام سازی توکن فعال شد" else "همگام سازی توکن غیرفعال")}
    }
    fun clearData(){
        storage.clearAll()
        _ui.update{ it.copy(feedback="تمام داده‌ها پاک شد — اپ را ریستارت کنید")}
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(vm: SettingsViewModel = hiltViewModel(), onBack:()->Unit = {}){
    val ui by vm.uiState.collectAsState()
    Scaffold(containerColor=com.coupleos.app.ui.theme.Background, topBar={ TopAppBar(title={Text("تنظیمات ⚙️", color=com.coupleos.app.ui.theme.TextPrimary)}, colors=TopAppBarDefaults.topAppBarColors(containerColor=com.coupleos.app.ui.theme.Surface))}){ pad->
        Column(Modifier.fillMaxSize().padding(pad).verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement=Arrangement.spacedBy(16.dp)){
            if(ui.feedback!=null){ Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=com.coupleos.app.ui.theme.PrimaryContainer), shape=RoundedCornerShape(12.dp)){ Text(ui.feedback!!, Modifier.padding(12.dp), color=com.coupleos.app.ui.theme.TextPrimary)}}
            Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=com.coupleos.app.ui.theme.Surface), shape=RoundedCornerShape(16.dp)){
                Column(Modifier.padding(16.dp), verticalArrangement=Arrangement.spacedBy(8.dp)){
                    Text("اتصال توکن‌ها", style=MaterialTheme.typography.titleSmall, color=com.coupleos.app.ui.theme.Primary)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement=Arrangement.SpaceBetween, verticalAlignment=Alignment.CenterVertically){
                        Column{
                            Text("توکن من: ${ui.myTokenMasked} ${if(ui.myUsername.isNotEmpty())"(${ui.myUsername})" else ""}", style=MaterialTheme.typography.bodySmall, color=com.coupleos.app.ui.theme.TextSecondary)
                            Text("توکن پارتنر: ${ui.partnerTokenMasked} ${if(ui.partnerUsername.isNotEmpty())"(${ui.partnerUsername})" else ""}", style=MaterialTheme.typography.bodySmall, color=com.coupleos.app.ui.theme.TextSecondary)
                            if(ui.myConnected!=null){ Text("وضعیت: من ${if(ui.myConnected==true) "✅" else "❌"} — پارتنر ${if(ui.partnerConnected==true) "✅" else "❌"}", style=MaterialTheme.typography.labelSmall, color=com.coupleos.app.ui.theme.TextTertiary)}
                        }
                    }
                    Button(onClick={ vm.checkConnection()}, modifier=Modifier.fillMaxWidth(), colors=ButtonDefaults.buttonColors(containerColor=com.coupleos.app.ui.theme.Primary), enabled=!ui.checking){
                        if(ui.checking) CircularProgressIndicator(Modifier.size(18.dp), color=com.coupleos.app.ui.theme.OnPrimary, strokeWidth=2.dp) else Text("بررسی اتصال توکن‌ها")
                    }
                    Text("اتصال تایید شه ولی دیتا روی توکن ذخیره میشه — این دکمه هم اتصال و هم خواندن/نوشتن Gist رو تست می‌کنه", style=MaterialTheme.typography.labelSmall, color=com.coupleos.app.ui.theme.TextTertiary)
                }
            }
            Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=com.coupleos.app.ui.theme.Surface), shape=RoundedCornerShape(16.dp)){
                Row(Modifier.padding(16.dp).fillMaxWidth(), horizontalArrangement=Arrangement.SpaceBetween, verticalAlignment=Alignment.CenterVertically){
                    Column(Modifier.weight(1f)){
                        Text("همگام سازی روی توکن (Gist)", style=MaterialTheme.typography.titleSmall, color=com.coupleos.app.ui.theme.TextPrimary)
                        Text("هر تغییری فوراً روی هر دو توکن ذخیره و از توکن خونده میشه", style=MaterialTheme.typography.labelSmall, color=com.coupleos.app.ui.theme.TextTertiary)
                    }
                    Switch(checked=ui.gistSyncEnabled, onCheckedChange={ vm.toggleGistSync(it)})
                }
            }
            Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=com.coupleos.app.ui.theme.Surface), shape=RoundedCornerShape(16.dp)){
                Column(Modifier.padding(16.dp), verticalArrangement=Arrangement.spacedBy(8.dp)){
                    Text("ذخیره‌سازی", style=MaterialTheme.typography.titleSmall, color=com.coupleos.app.ui.theme.Primary)
                    Text("• تمام داده‌ها اول در دیتابیس لوکال (Room) ذخیره میشن → آفلاین هم کار می‌کنه", style=MaterialTheme.typography.bodySmall, color=com.coupleos.app.ui.theme.TextSecondary)
                    Text("• بعد روی GitHub Gist هر دو توکن (ghp_...) به صورت JSON ذخیره میشن", style=MaterialTheme.typography.bodySmall, color=com.coupleos.app.ui.theme.TextSecondary)
                    Text("• هنگام ورود، از Gist خونده و با لوکال ادغام میشه — هیچ دیتایی گم نمیشه", style=MaterialTheme.typography.bodySmall, color=com.coupleos.app.ui.theme.TextSecondary)
                    Text("• بک‌آپ اضافی روی سرور (اگر DATABASE_URL تنظیم باشه)", style=MaterialTheme.typography.bodySmall, color=com.coupleos.app.ui.theme.TextSecondary)
                }
            }
            Card(Modifier.fillMaxWidth(), colors=CardDefaults.cardColors(containerColor=com.coupleos.app.ui.theme.Surface), shape=RoundedCornerShape(16.dp)){
                Column(Modifier.padding(16.dp), verticalArrangement=Arrangement.spacedBy(8.dp)){
                    Text("خطر", style=MaterialTheme.typography.titleSmall, color=com.coupleos.app.ui.theme.Danger)
                    Button(onClick={ vm.clearData()}, colors=ButtonDefaults.buttonColors(containerColor=com.coupleos.app.ui.theme.Danger), modifier=Modifier.fillMaxWidth()){ Text("حذف تمام داده‌ها و خروج از جفت")}
                }
            }
            Spacer(Modifier.height(60.dp))
        }
    }
}
