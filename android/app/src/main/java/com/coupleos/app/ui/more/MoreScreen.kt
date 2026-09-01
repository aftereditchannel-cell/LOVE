package com.coupleos.app.ui.more

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.coupleos.app.ui.Screen
import com.coupleos.app.ui.theme.*

private data class MoreEntry(
    val emoji: String,
    val title: String,
    val subtitle: String,
    val route: String,
    val tint: Color,
)

private val tileTints = listOf(
    Color(0xFFFFD6E0), Color(0xFFFFE3C2), Color(0xFFC9F3DE),
    Color(0xFFCDE8FF), Color(0xFFE8D6FF), Color(0xFFFFD9F0),
)

@Composable
fun MoreScreen(navController: NavController) {
    val personal = listOf(
        MoreEntry("👤", "پروفایل", "مشخصات و عکس ما", Screen.Profile.route, tileTints[0]),
        MoreEntry("😊", "حال روزانه", "امروز چطوری؟", Screen.Mood.route, tileTints[1]),
        MoreEntry("📓", "دفتر خاطرات", "خصوصی و مشترک", Screen.Journal.route, tileTints[2]),
    )
    val world = listOf(
        MoreEntry("📖", "داستان ما", "خط زمانی خاطرات", Screen.OurStory.route, tileTints[3]),
        MoreEntry("📸", "عکس‌های ما", "گالری روی توکن", Screen.Photos.route, tileTints[4]),
        MoreEntry("⭐", "لیست آرزوها", "چیزایی که دلمون می‌خواد", Screen.Wishlist.route, tileTints[5]),
        MoreEntry("🎯", "لیست خواسته‌ها", "کارایی که با هم انجام بدیم", Screen.BucketList.route, tileTints[0]),
        MoreEntry("⏱️", "شمارش معکوس", "روزهای مونده", Screen.Countdown.route, tileTints[1]),
    )
    val special = listOf(
        MoreEntry("💌", "نامه‌های عاشقانه", "زمان‌دار و مخفی", Screen.Letters.route, tileTints[2]),
        MoreEntry("🎁", "سورپرایزها", "برای همدیگه", Screen.Surprises.route, tileTints[3]),
        MoreEntry("🍝", "برنامه قرار", "ایده‌های دونفره", Screen.DatePlanner.route, tileTints[4]),
        MoreEntry("❓", "سؤال روزانه", "جواب دوتایی", Screen.Questions.route, tileTints[5]),
        MoreEntry("💞", "رابطه ما", "حس و حال دونفره", Screen.Relationship.route, tileTints[0]),
        MoreEntry("🧊", "یخچال عشق", "نوت‌های چسبونکی", Screen.LoveNotes.route, tileTints[1]),
        MoreEntry("💋", "بوس‌شمار", "بوس لمسی دونفره", Screen.Kisses.route, tileTints[2]),
        MoreEntry("🐰", "حیوون دونفره", "غذا بده و نوازش کن", Screen.Pet.route, tileTints[3]),
        MoreEntry("🫙", "شیشه تعریف", "تعریف‌های قشنگ", Screen.Jar.route, tileTints[4]),
        MoreEntry("🥠", "فال عشق", "فال امروز", Screen.Fortune.route, tileTints[5]),
        MoreEntry("🎮", "بازی دونفره", "کی منو بهتر می‌شناسه", Screen.Games.route, tileTints[0]),
        MoreEntry("🔥", "عادت‌های دونفره", "استریک بسازید", Screen.Habits.route, tileTints[1]),
        MoreEntry("🎵", "آهنگ ما", "پلی‌لیست دونفره", Screen.Music.route, tileTints[2]),
    )
    val manage = listOf(
        MoreEntry("✅", "کارها", "کارهای دونفره", Screen.Tasks.route, tileTints[3]),
        MoreEntry("💰", "هزینه‌ها", "خرج‌های مشترک", Screen.Expenses.route, tileTints[4]),
    )
    val tools = listOf(
        MoreEntry("🤖", "دستیار هوشمند", "پیشنهاد کادو و قرار", Screen.AI.route, tileTints[5]),
        MoreEntry("🔍", "جستجو", "توی دنیای ما", Screen.Search.route, tileTints[0]),
        MoreEntry("🎨", "کاستوم‌سازی", "تم و رنگ‌ها", Screen.Customize.route, tileTints[1]),
        MoreEntry("⚙️", "تنظیمات", "امنیت و همگام‌سازی", Screen.Settings.route, tileTints[2]),
    )

    CuteBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            Text(text = "💕", fontSize = 40.sp)
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "دنیای کوچیک ما",
                style = MaterialTheme.typography.headlineMedium,
                color = TextPrimary,
            )
            Text(
                text = "همه قابلیت‌ها فعاله — دیتا واقعاً روی توکن گیت ذخیره می‌شه ❤️",
                style = MaterialTheme.typography.bodySmall,
                color = TextTertiary,
            )

            Spacer(modifier = Modifier.height(20.dp))

            SectionTitle("👤 شخصی")
            personal.forEach { e -> MoreTile(e) { navController.navigate(e.route) } }

            Spacer(modifier = Modifier.height(16.dp))

            SectionTitle("🌍 دنیای ما")
            world.forEach { e -> MoreTile(e) { navController.navigate(e.route) } }

            Spacer(modifier = Modifier.height(16.dp))

            SectionTitle("💝 ویژه")
            special.forEach { e -> MoreTile(e) { navController.navigate(e.route) } }

            Spacer(modifier = Modifier.height(16.dp))

            SectionTitle("🧰 مدیریت")
            manage.forEach { e -> MoreTile(e) { navController.navigate(e.route) } }

            Spacer(modifier = Modifier.height(16.dp))

            SectionTitle("🛠 ابزار")
            tools.forEach { e -> MoreTile(e) { navController.navigate(e.route) } }

            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

@Composable
private fun SectionTitle(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.labelLarge,
        color = TextSecondary,
        modifier = Modifier.padding(vertical = 8.dp),
    )
}

@Composable
private fun MoreTile(entry: MoreEntry, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(
                Brush.horizontalGradient(
                    listOf(Surface.copy(alpha = 0.9f), SurfaceElevated.copy(alpha = 0.7f))
                )
            )
            .clickable(onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(46.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(entry.tint.copy(alpha = 0.25f)),
            contentAlignment = Alignment.Center,
        ) {
            Text(text = entry.emoji, fontSize = 22.sp)
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(text = entry.title, style = MaterialTheme.typography.bodyLarge, color = TextPrimary)
            Text(text = entry.subtitle, style = MaterialTheme.typography.labelSmall, color = TextTertiary)
        }
        Text(text = "›", style = MaterialTheme.typography.bodyLarge, color = TextTertiary)
    }
    Spacer(modifier = Modifier.height(8.dp))
}
