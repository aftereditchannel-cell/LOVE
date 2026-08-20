package com.coupleos.app.ui

import androidx.compose.animation.*
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.*
import com.coupleos.app.R
import com.coupleos.app.ui.calendar.CalendarScreen
import com.coupleos.app.ui.chat.ChatScreen
import com.coupleos.app.ui.dashboard.DashboardScreen
import com.coupleos.app.ui.lock.LockScreen
import com.coupleos.app.ui.memories.MemoriesScreen
import com.coupleos.app.ui.mood.MoodScreen
import com.coupleos.app.ui.more.MoreScreen
import com.coupleos.app.ui.setup.SetupScreen
import com.coupleos.app.ui.splash.SplashScreen
import com.coupleos.app.ui.theme.*

sealed class Screen(val route: String) {
    data object Splash : Screen("splash")
    data object Setup : Screen("setup")
    data object Lock : Screen("lock")
    data object Home : Screen("home")
    data object Chat : Screen("chat")
    data object Memories : Screen("memories")
    data object Calendar : Screen("calendar")
    data object More : Screen("more")
    data object Mood : Screen("mood")
    data object Journal : Screen("journal")
    data object Photos : Screen("photos")
    data object Tasks : Screen("tasks")
    data object Wishlist : Screen("wishlist")
    data object BucketList : Screen("bucket_list")
    data object Letters : Screen("love_letters")
    data object Questions : Screen("questions")
    data object Countdown : Screen("countdown")
    data object DatePlanner : Screen("date_planner")
    data object Expenses : Screen("expenses")
    data object Surprises : Screen("surprises")
    data object Relationship : Screen("relationship")
    data object Profile : Screen("profile")
    data object OurStory : Screen("our_story")
    data object Settings : Screen("settings")
    data object Search : Screen("search")
}

data class BottomNavItem(
    val screen: Screen,
    val labelRes: Int,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
)

val bottomNavItems = listOf(
    BottomNavItem(Screen.Home, R.string.nav_home, Icons.Filled.Home, Icons.Outlined.Home),
    BottomNavItem(Screen.Chat, R.string.nav_chat, Icons.Filled.Chat, Icons.Outlined.Chat),
    BottomNavItem(Screen.Memories, R.string.nav_memories, Icons.Filled.Favorite, Icons.Outlined.FavoriteBorder),
    BottomNavItem(Screen.Calendar, R.string.nav_calendar, Icons.Filled.CalendarMonth, Icons.Outlined.CalendarMonth),
    BottomNavItem(Screen.More, R.string.nav_more, Icons.Filled.MoreHoriz, Icons.Outlined.MoreHoriz),
)

@Composable
fun CoupleOSApp(
    viewModel: AppViewModel = hiltViewModel()
) {
    val appState by viewModel.appState.collectAsState()
    val navController = rememberNavController()

    when (appState) {
        AppState.Loading -> SplashScreen()
        AppState.NeedSetup -> SetupScreen(
            onSetupComplete = { viewModel.onSetupComplete() }
        )
        AppState.NeedLock -> LockScreen(
            isSetup = true,
            onUnlocked = { viewModel.onLockSetupComplete() }
        )
        AppState.Locked -> LockScreen(
            isSetup = false,
            onUnlocked = { viewModel.onUnlocked() }
        )
        AppState.Ready -> MainContent(navController = navController)
    }
}

@Composable
fun MainContent(navController: NavHostController) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    val showBottomBar = currentDestination?.hierarchy?.any { dest ->
        bottomNavItems.any { it.screen.route == dest.route }
    } == true

    Scaffold(
        containerColor = Background,
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(
                    containerColor = Surface,
                    contentColor = TextPrimary,
                ) {
                    bottomNavItems.forEach { item ->
                        val selected = currentDestination?.hierarchy?.any {
                            it.route == item.screen.route
                        } == true

                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(item.screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                Icon(
                                    imageVector = if (selected) item.selectedIcon else item.unselectedIcon,
                                    contentDescription = stringResource(item.labelRes),
                                    tint = if (selected) Primary else TextTertiary,
                                )
                            },
                            label = {
                                Text(
                                    text = stringResource(item.labelRes),
                                    color = if (selected) Primary else TextTertiary,
                                    style = MaterialTheme.typography.labelSmall,
                                )
                            },
                            colors = NavigationBarItemDefaults.colors(
                                indicatorColor = PrimaryContainer,
                            ),
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(paddingValues),
        ) {
            composable(Screen.Home.route) { DashboardScreen(navController = navController) }
            composable(Screen.Chat.route) { ChatScreen() }
            composable(Screen.Memories.route) { MemoriesScreen(navController = navController) }
            composable(Screen.Calendar.route) { CalendarScreen() }
            composable(Screen.More.route) { MoreScreen(navController = navController) }
            composable(Screen.Mood.route) { MoodScreen(onBack = { navController.popBackStack() }) }
        }
    }
}
