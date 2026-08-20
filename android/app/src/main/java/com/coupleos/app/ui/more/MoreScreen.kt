package com.coupleos.app.ui.more

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.coupleos.app.R
import com.coupleos.app.ui.Screen
import com.coupleos.app.ui.theme.*

@Composable
fun MoreScreen(navController: NavController) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
    ) {
        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = stringResource(R.string.nav_more),
            style = MaterialTheme.typography.headlineMedium,
            color = TextPrimary,
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Section: Personal
        SectionTitle("شخصی")
        MoreMenuItem(Icons.Outlined.Person, stringResource(R.string.more_profile)) { }
        MoreMenuItem(Icons.Outlined.Mood, "حال روزانه") { navController.navigate(Screen.Mood.route) }
        MoreMenuItem(Icons.Outlined.Book, "دفتر خاطرات") { }

        Spacer(modifier = Modifier.height(16.dp))

        // Section: Together
        SectionTitle("دنیای ما")
        MoreMenuItem(Icons.Outlined.AutoStories, stringResource(R.string.more_our_story)) { }
        MoreMenuItem(Icons.Outlined.PhotoCamera, stringResource(R.string.more_photos)) { }
        MoreMenuItem(Icons.Outlined.Star, stringResource(R.string.more_wishlist)) { }
        MoreMenuItem(Icons.Outlined.Checklist, stringResource(R.string.more_bucket_list)) { }
        MoreMenuItem(Icons.Outlined.Timer, stringResource(R.string.more_countdown)) { }

        Spacer(modifier = Modifier.height(16.dp))

        // Section: Special
        SectionTitle("ویژه")
        MoreMenuItem(Icons.Outlined.Email, stringResource(R.string.more_love_letters)) { }
        MoreMenuItem(Icons.Outlined.CardGiftcard, stringResource(R.string.more_surprises)) { }
        MoreMenuItem(Icons.Outlined.Restaurant, stringResource(R.string.more_date_planner)) { }
        MoreMenuItem(Icons.Outlined.QuestionAnswer, stringResource(R.string.more_questions)) { }
        MoreMenuItem(Icons.Outlined.Favorite, stringResource(R.string.more_relationship)) { }

        Spacer(modifier = Modifier.height(16.dp))

        // Section: Manage
        SectionTitle("مدیریت")
        MoreMenuItem(Icons.Outlined.CheckCircle, stringResource(R.string.more_tasks)) { }
        MoreMenuItem(Icons.Outlined.AccountBalanceWallet, stringResource(R.string.more_expenses)) { }

        Spacer(modifier = Modifier.height(16.dp))

        // Section: Tools
        SectionTitle("ابزار")
        MoreMenuItem(Icons.Outlined.SmartToy, stringResource(R.string.more_ai)) { }
        MoreMenuItem(Icons.Outlined.Settings, stringResource(R.string.more_settings)) { }

        Spacer(modifier = Modifier.height(80.dp))
    }
}

@Composable
private fun SectionTitle(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.labelMedium,
        color = TextTertiary,
        modifier = Modifier.padding(vertical = 8.dp),
    )
}

@Composable
private fun MoreMenuItem(
    icon: ImageVector,
    title: String,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 14.dp, horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = title,
            tint = Primary,
            modifier = Modifier.size(22.dp),
        )
        Spacer(modifier = Modifier.width(16.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.bodyLarge,
            color = TextPrimary,
        )
    }
    HorizontalDivider(color = DividerColor, thickness = 0.5.dp)
}
