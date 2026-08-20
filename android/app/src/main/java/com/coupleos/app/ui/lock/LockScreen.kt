package com.coupleos.app.ui.lock

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Backspace
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.coupleos.app.R
import com.coupleos.app.ui.theme.*

@Composable
fun LockScreen(
    isSetup: Boolean,
    onUnlocked: () -> Unit,
    viewModel: LockViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.isUnlocked) {
        if (uiState.isUnlocked) {
            onUnlocked()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Background),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(32.dp),
        ) {
            Text(text = "❤️", fontSize = 40.sp)

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = if (isSetup) {
                    stringResource(R.string.lock_setup_title)
                } else {
                    stringResource(R.string.lock_enter_pin)
                },
                style = MaterialTheme.typography.titleMedium,
                color = TextPrimary,
                textAlign = TextAlign.Center,
            )

            if (isSetup && uiState.isConfirming) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = stringResource(R.string.lock_confirm_pin),
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary,
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // PIN dots
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                repeat(4) { index ->
                    Box(
                        modifier = Modifier
                            .size(16.dp)
                            .clip(CircleShape)
                            .background(
                                if (index < uiState.enteredPin.length) Primary
                                else DividerColor
                            )
                    )
                }
            }

            if (uiState.error != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = uiState.error!!,
                    style = MaterialTheme.typography.bodySmall,
                    color = Danger,
                )
            }

            Spacer(modifier = Modifier.height(40.dp))

            // Number pad
            NumberPad(
                onDigit = { digit ->
                    if (isSetup) viewModel.onSetupDigit(digit)
                    else viewModel.onUnlockDigit(digit)
                },
                onDelete = { viewModel.onDelete() },
                onBiometric = if (!isSetup) {{ viewModel.onBiometric() }} else null,
            )
        }
    }
}

@Composable
private fun NumberPad(
    onDigit: (Int) -> Unit,
    onDelete: () -> Unit,
    onBiometric: (() -> Unit)?,
) {
    val numbers = listOf(
        listOf(1, 2, 3),
        listOf(4, 5, 6),
        listOf(7, 8, 9),
    )

    Column(
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        numbers.forEach { row ->
            Row(
                horizontalArrangement = Arrangement.spacedBy(24.dp),
            ) {
                row.forEach { digit ->
                    NumberKey(
                        text = digit.toString(),
                        onClick = { onDigit(digit) },
                    )
                }
            }
        }

        // Last row: Biometric / 0 / Delete
        Row(
            horizontalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            if (onBiometric != null) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape)
                        .background(SurfaceElevated)
                        .clickable(onClick = onBiometric),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Default.Fingerprint,
                        contentDescription = "Biometric",
                        tint = Primary,
                        modifier = Modifier.size(28.dp),
                    )
                }
            } else {
                Spacer(modifier = Modifier.size(64.dp))
            }

            NumberKey(text = "0", onClick = { onDigit(0) })

            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .clickable(onClick = onDelete),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Default.Backspace,
                    contentDescription = "Delete",
                    tint = TextSecondary,
                    modifier = Modifier.size(24.dp),
                )
            }
        }
    }
}

@Composable
private fun NumberKey(
    text: String,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(64.dp)
            .clip(CircleShape)
            .background(SurfaceElevated)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.headlineMedium,
            color = TextPrimary,
        )
    }
}
