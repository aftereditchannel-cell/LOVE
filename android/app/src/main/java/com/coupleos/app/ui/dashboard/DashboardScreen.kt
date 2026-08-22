package com.coupleos.app.ui.dashboard

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.coupleos.app.ui.Screen
import com.coupleos.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    navController: NavController,
    viewModel: DashboardViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    // Show snackbar messages
    LaunchedEffect(uiState.feedbackMessage) {
        uiState.feedbackMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearFeedback()
        }
    }

    Scaffold(
        containerColor = Background,
        snackbarHost = {
            SnackbarHost(snackbarHostState) { data ->
                Snackbar(
                    snackbarData = data,
                    containerColor = SurfaceElevated,
                    contentColor = TextPrimary,
                    actionColor = Primary,
                )
            }
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp),
            ) {
                Spacer(modifier = Modifier.height(16.dp))

                // Greeting
                Text(
                    text = "سلام ${uiState.userName} ❤️",
                    style = MaterialTheme.typography.displaySmall,
                    color = TextPrimary,
                )

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = uiState.dateString,
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary,
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Connection status card
                ConnectionStatusCard(
                    myConnected = uiState.myConnected,
                    partnerConnected = uiState.partnerConnected,
                    myUsername = uiState.myGitHubUsername,
                    partnerUsername = uiState.partnerGitHubUsername,
                    onRefresh = { viewModel.checkConnection() },
                    isChecking = uiState.isCheckingConnection,
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Mood cards row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    DashboardCard(
                        modifier = Modifier.weight(1f),
                        title = "حال امروزت",
                        onClick = { navController.navigate(Screen.Mood.route) },
                    ) {
                        if (uiState.todayMood != null) {
                            Text(text = uiState.todayMoodEmoji, fontSize = 32.sp)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = uiState.todayMood!!,
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary,
                            )
                        } else {
                            Text(text = "🤔", fontSize = 32.sp)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "ثبت نکردی هنوز",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextTertiary,
                                textAlign = TextAlign.Center,
                            )
                        }
                    }

                    DashboardCard(
                        modifier = Modifier.weight(1f),
                        title = "حال پارتنرت",
                    ) {
                        if (uiState.partnerMood != null) {
                            Text(text = uiState.partnerMoodEmoji, fontSize = 32.sp)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = uiState.partnerMood!!,
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary,
                            )
                            if (uiState.partnerNeedsAttention) {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "شاید الان بیشتر بهت نیاز داشته باشه ❤️",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Primary,
                                    textAlign = TextAlign.Center,
                                )
                            }
                        } else {
                            Text(text = "💭", fontSize = 32.sp)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "هنوز ثبت نشده",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextTertiary,
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Days together
                if (uiState.daysTogether > 0) {
                    DashboardCard(modifier = Modifier.fillMaxWidth(), title = "") {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text(
                                    text = "${uiState.daysTogether}",
                                    style = MaterialTheme.typography.displayMedium,
                                    color = Primary,
                                )
                                Text(text = "روز با هم", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                            }
                            Text(text = "❤️", fontSize = 40.sp)
                        }
                    }
                }

                // Countdown
                if (uiState.nextCountdown != null) {
                    Spacer(modifier = Modifier.height(12.dp))
                    DashboardCard(modifier = Modifier.fillMaxWidth(), title = "رویداد بعدی") {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text(text = uiState.nextCountdown!!.first, style = MaterialTheme.typography.titleSmall, color = TextPrimary)
                                Text(text = "${uiState.nextCountdown!!.second} روز مونده", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                            }
                            Text(text = "🎯", fontSize = 24.sp)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Daily question
                DashboardCard(modifier = Modifier.fillMaxWidth(), title = "سؤال امروز") {
                    Text(
                        text = uiState.dailyQuestion ?: "امروز بیشتر از همه دلت چی می‌خواد؟",
                        style = MaterialTheme.typography.bodyLarge,
                        color = TextPrimary,
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Quick actions
                Text(text = "دسترسی سریع", style = MaterialTheme.typography.titleSmall, color = TextSecondary)
                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    QuickAction(Modifier.weight(1f), Icons.Outlined.Mood, "حال") { navController.navigate(Screen.Mood.route) }
                    QuickAction(Modifier.weight(1f), Icons.Outlined.PhotoCamera, "خاطره") { navController.navigate(Screen.Memories.route) }
                    QuickAction(Modifier.weight(1f), Icons.Outlined.EditNote, "یادداشت") { }
                    QuickAction(Modifier.weight(1f), Icons.Outlined.CheckCircle, "کار") { }
                }

                // Tasks
                if (uiState.activeTaskCount > 0) {
                    Spacer(modifier = Modifier.height(16.dp))
                    DashboardCard(modifier = Modifier.fillMaxWidth(), title = "کارها") {
                        Text(text = "${uiState.activeTaskCount} کار فعال", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                    }
                }

                // Insights
                if (uiState.insights.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(16.dp))
                    uiState.insights.forEach { insight ->
                        DashboardCard(modifier = Modifier.fillMaxWidth(), title = "") {
                            Text(text = insight, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                }

                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }
}

@Composable
private fun ConnectionStatusCard(
    myConnected: Boolean?,
    partnerConnected: Boolean?,
    myUsername: String?,
    partnerUsername: String?,
    onRefresh: () -> Unit,
    isChecking: Boolean,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (myConnected == true && partnerConnected == true) PrimaryContainer else SurfaceElevated)
            .clickable(onClick = onRefresh)
            .padding(12.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (isChecking) {
                        CircularProgressIndicator(modifier = Modifier.size(14.dp), color = Primary, strokeWidth = 2.dp)
                    } else {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(if (myConnected == true) Success else Danger)
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (myConnected == true) "من: متصل${myUsername?.let { " ($it)" } ?: ""}"
                        else if (myConnected == false) "من: قطع"
                        else "بررسی اتصال...",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary,
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(if (partnerConnected == true) Success else if (partnerConnected == false) Danger else TextTertiary)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (partnerConnected == true) "پارتنر: متصل${partnerUsername?.let { " ($it)" } ?: ""}"
                        else if (partnerConnected == false) "پارتنر: قطع"
                        else "بررسی...",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary,
                    )
                }
            }
            Icon(
                imageVector = Icons.Outlined.Refresh,
                contentDescription = "Refresh",
                tint = TextTertiary,
                modifier = Modifier.size(18.dp),
            )
        }
    }
}

@Composable
fun DashboardCard(
    modifier: Modifier = Modifier,
    title: String,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(Surface)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(16.dp),
    ) {
        if (title.isNotEmpty()) {
            Text(text = title, style = MaterialTheme.typography.labelMedium, color = TextTertiary)
            Spacer(modifier = Modifier.height(8.dp))
        }
        content()
    }
}

@Composable
fun QuickAction(
    modifier: Modifier = Modifier,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit,
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Surface)
            .clickable(onClick = onClick)
            .padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(imageVector = icon, contentDescription = label, tint = Primary, modifier = Modifier.size(24.dp))
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = label, style = MaterialTheme.typography.labelSmall, color = TextSecondary)
    }
}
