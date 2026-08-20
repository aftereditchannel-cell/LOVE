package com.coupleos.app.ui.mood

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
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

data class MoodOption(val emoji: String, val label: String, val value: String)

val moodOptions = listOf(
    MoodOption("😍", "عالی", "عالی"),
    MoodOption("🥰", "عاشق", "عاشق"),
    MoodOption("😊", "خوب", "خوب"),
    MoodOption("🙂", "معمولی", "معمولی"),
    MoodOption("😐", "خنثی", "خنثی"),
    MoodOption("😔", "ناراحت", "ناراحت"),
    MoodOption("😢", "خیلی بد", "خیلی بد"),
    MoodOption("😡", "عصبانی", "عصبانی"),
    MoodOption("😴", "خسته", "خسته"),
)

@Composable
fun MoodScreen(
    onBack: () -> Unit,
    viewModel: MoodViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.saved) {
        if (uiState.saved) onBack()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Background)
            .verticalScroll(rememberScrollState()),
    ) {
        // Top bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Default.ArrowBack, "Back", tint = TextPrimary)
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = stringResource(R.string.mood_how_are_you),
                style = MaterialTheme.typography.headlineMedium,
                color = TextPrimary,
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Mood grid
        Column(
            modifier = Modifier.padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // 3-column grid
            moodOptions.chunked(3).forEach { row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    row.forEach { mood ->
                        val isSelected = uiState.selectedMood == mood.value
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(16.dp))
                                .background(if (isSelected) PrimaryContainer else Surface)
                                .border(
                                    width = if (isSelected) 2.dp else 0.dp,
                                    color = if (isSelected) Primary else Surface,
                                    shape = RoundedCornerShape(16.dp),
                                )
                                .clickable { viewModel.selectMood(mood.value) }
                                .padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text(text = mood.emoji, fontSize = 32.sp)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = mood.label,
                                style = MaterialTheme.typography.labelMedium,
                                color = if (isSelected) Primary else TextSecondary,
                                textAlign = TextAlign.Center,
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Sliders
        Column(modifier = Modifier.padding(horizontal = 20.dp)) {
            MoodSlider(
                label = stringResource(R.string.mood_energy),
                value = uiState.energy,
                onValueChange = { viewModel.updateEnergy(it) },
            )
            MoodSlider(
                label = stringResource(R.string.mood_stress),
                value = uiState.stress,
                onValueChange = { viewModel.updateStress(it) },
            )
            MoodSlider(
                label = stringResource(R.string.mood_sleep),
                value = uiState.sleep,
                onValueChange = { viewModel.updateSleep(it) },
            )
            MoodSlider(
                label = stringResource(R.string.mood_love_level),
                value = uiState.loveLevel,
                onValueChange = { viewModel.updateLoveLevel(it) },
            )
            MoodSlider(
                label = stringResource(R.string.mood_social_battery),
                value = uiState.socialBattery,
                onValueChange = { viewModel.updateSocialBattery(it) },
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Note field
        OutlinedTextField(
            value = uiState.note,
            onValueChange = { viewModel.updateNote(it) },
            label = { Text("یادداشت") },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            minLines = 2,
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

        Spacer(modifier = Modifier.height(24.dp))

        // Save button
        Button(
            onClick = { viewModel.saveMood() },
            enabled = uiState.selectedMood != null,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .height(52.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Primary,
                contentColor = OnPrimary,
            ),
            shape = RoundedCornerShape(16.dp),
        ) {
            Text(
                text = stringResource(R.string.save),
                style = MaterialTheme.typography.labelLarge,
            )
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
private fun MoodSlider(
    label: String,
    value: Int,
    onValueChange: (Int) -> Unit,
) {
    Column(modifier = Modifier.padding(vertical = 8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(text = label, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
            Text(text = "$value/10", style = MaterialTheme.typography.bodySmall, color = TextTertiary)
        }
        Slider(
            value = value.toFloat(),
            onValueChange = { onValueChange(it.toInt()) },
            valueRange = 1f..10f,
            steps = 8,
            colors = SliderDefaults.colors(
                thumbColor = Primary,
                activeTrackColor = Primary,
                inactiveTrackColor = DividerColor,
            ),
        )
    }
}
