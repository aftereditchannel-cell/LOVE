package com.coupleos.app.ui.setup

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.coupleos.app.ui.theme.*

@Composable
fun SetupScreen(
    onSetupComplete: () -> Unit,
    viewModel: SetupViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.isPaired) {
        if (uiState.isPaired) {
            onSetupComplete()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Background),
    ) {
        when (uiState.step) {
            SetupStep.CHOOSE_PERSON -> ChoosePersonStep(
                personAName = uiState.personAName,
                personBName = uiState.personBName,
                onPersonSelected = { viewModel.selectPerson(it) }
            )
            SetupStep.ENTER_PERSONAL_TOKEN, SetupStep.VALIDATING_PERSONAL -> TokenStep(
                title = "توکن GitHub خودت رو وارد کن",
                label = "توکن شخصی (ghp_...)",
                token = uiState.personalToken,
                onTokenChange = { viewModel.updatePersonalToken(it) },
                onNext = { viewModel.validatePersonalToken() },
                onBack = { viewModel.goBack() },
                isLoading = uiState.isLoading,
                error = uiState.error,
                successMessage = uiState.successMessage,
                hint = "توکن GitHub Personal Access Token خودت",
            )
            SetupStep.ENTER_PARTNER_TOKEN, SetupStep.VALIDATING_PARTNER -> TokenStep(
                title = "توکن GitHub پارتنرت رو وارد کن",
                label = "توکن پارتنر (ghp_...)",
                token = uiState.partnerToken,
                onTokenChange = { viewModel.updatePartnerToken(it) },
                onNext = { viewModel.validateAndPair() },
                onBack = { viewModel.goBack() },
                isLoading = uiState.isLoading,
                error = uiState.error,
                successMessage = uiState.successMessage,
                hint = "توکن GitHub Personal Access Token پارتنرت",
                connectedUsername = uiState.myGitHubUsername,
            )
            SetupStep.PAIRING -> PairingStep()
            SetupStep.COMPLETE -> PairingCompleteStep(
                myUsername = uiState.myGitHubUsername,
                partnerUsername = uiState.partnerGitHubUsername,
            )
        }
    }
}

@Composable
private fun ChoosePersonStep(
    personAName: String,
    personBName: String,
    onPersonSelected: (String) -> Unit,
) {
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { visible = true }

    val alpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(600),
        label = "choose_alpha"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp)
            .alpha(alpha),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(text = "❤️", fontSize = 56.sp)
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = "دنیای کوچیک ما",
            style = MaterialTheme.typography.displaySmall,
            color = TextPrimary,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "این دنیای کوچیک فقط برای ما دوتاست",
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(48.dp))
        Text(
            text = "تو کدومی؟",
            style = MaterialTheme.typography.headlineMedium,
            color = TextPrimary,
        )
        Spacer(modifier = Modifier.height(24.dp))
        PersonButton(name = personAName, onClick = { onPersonSelected("PERSON_A") })
        Spacer(modifier = Modifier.height(16.dp))
        PersonButton(name = personBName, onClick = { onPersonSelected("PERSON_B") })
    }
}

@Composable
private fun PersonButton(name: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceElevated)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = "من ${name}م",
            style = MaterialTheme.typography.titleMedium,
            color = Primary,
        )
    }
}

@Composable
private fun TokenStep(
    title: String,
    label: String,
    token: String,
    onTokenChange: (String) -> Unit,
    onNext: () -> Unit,
    onBack: () -> Unit,
    isLoading: Boolean,
    error: String?,
    successMessage: String?,
    hint: String = "",
    connectedUsername: String? = null,
) {
    var passwordVisible by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
    ) {
        Spacer(modifier = Modifier.height(16.dp))

        IconButton(onClick = onBack) {
            Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = TextPrimary)
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = title,
            style = MaterialTheme.typography.headlineSmall,
            color = TextPrimary,
        )

        // Show connected account info
        if (connectedUsername != null) {
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = Success,
                    modifier = Modifier.size(16.dp),
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "اکانت تو: $connectedUsername",
                    style = MaterialTheme.typography.bodySmall,
                    color = Success,
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Token input — force LTR for token text
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
            OutlinedTextField(
                value = token,
                onValueChange = onTokenChange,
                label = { Text(label) },
                placeholder = { Text("ghp_xxxxxxxxxxxx", color = TextTertiary) },
                singleLine = true,
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                            contentDescription = if (passwordVisible) "Hide" else "Show",
                            tint = TextTertiary,
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Primary,
                    unfocusedBorderColor = DividerColor,
                    focusedLabelColor = Primary,
                    unfocusedLabelColor = TextTertiary,
                    cursorColor = Primary,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                ),
                shape = RoundedCornerShape(12.dp),
            )
        }

        if (hint.isNotEmpty()) {
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = hint,
                style = MaterialTheme.typography.bodySmall,
                color = TextTertiary,
            )
        }

        // Error message
        if (error != null) {
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = "❌ $error",
                style = MaterialTheme.typography.bodySmall,
                color = Danger,
            )
        }

        // Success message
        if (successMessage != null) {
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = successMessage,
                style = MaterialTheme.typography.bodySmall,
                color = Success,
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = onNext,
            enabled = token.isNotBlank() && !isLoading,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Primary,
                contentColor = OnPrimary,
                disabledContainerColor = PrimaryDark.copy(alpha = 0.4f),
            ),
            shape = RoundedCornerShape(16.dp),
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    color = OnPrimary,
                    strokeWidth = 2.dp,
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "در حال بررسی...",
                    style = MaterialTheme.typography.labelLarge,
                )
            } else {
                Text(
                    text = "تأیید و اتصال",
                    style = MaterialTheme.typography.labelLarge,
                )
            }
        }
    }
}

@Composable
private fun PairingStep() {
    Box(
        modifier = Modifier.fillMaxSize().background(Background),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator(color = Primary)
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "در حال اتصال به GitHub...",
                style = MaterialTheme.typography.bodyLarge,
                color = TextSecondary,
            )
        }
    }
}

@Composable
private fun PairingCompleteStep(
    myUsername: String?,
    partnerUsername: String?,
) {
    Box(
        modifier = Modifier.fillMaxSize().background(Background),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = "❤️", fontSize = 64.sp)
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "اتصال برقرار شد!",
                style = MaterialTheme.typography.headlineMedium,
                color = Primary,
            )
            if (myUsername != null && partnerUsername != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "$myUsername ❤️ $partnerUsername",
                    style = MaterialTheme.typography.bodyLarge,
                    color = TextSecondary,
                )
            }
        }
    }
}
