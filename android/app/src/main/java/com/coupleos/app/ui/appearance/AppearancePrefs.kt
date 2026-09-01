package com.coupleos.app.ui.appearance

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

data class AppearanceState(
    val theme: String = "rose-glass",
    val accent: Int = 0xFFFF8AA0,
    val glass: Int = 22,
    val particles: Boolean = true,
    val cuteStickers: Boolean = true,
    val fontScale: Float = 1f,
    val radius: Int = 22,
    val coupleTitle: String = "دنیای کوچیک ما",
)

@Singleton
class AppearancePrefs @Inject constructor(
    @ApplicationContext context: Context,
) {
    private val prefs = context.getSharedPreferences("couple_os_look", Context.MODE_PRIVATE)
    private val _state = MutableStateFlow(read())
    val state: StateFlow<AppearanceState> = _state

    private fun read(): AppearanceState = AppearanceState(
        theme = prefs.getString("theme", "rose-glass") ?: "rose-glass",
        accent = prefs.getInt("accent", 0xFFFF8AA0),
        glass = prefs.getInt("glass", 22),
        particles = prefs.getBoolean("particles", true),
        cuteStickers = prefs.getBoolean("cute", true),
        fontScale = prefs.getFloat("font", 1f),
        radius = prefs.getInt("radius", 22),
        coupleTitle = prefs.getString("title", "دنیای کوچیک ما") ?: "دنیای کوچیک ما",
    )

    fun update(patch: AppearanceState) {
        prefs.edit()
            .putString("theme", patch.theme)
            .putInt("accent", patch.accent)
            .putInt("glass", patch.glass)
            .putBoolean("particles", patch.particles)
            .putBoolean("cute", patch.cuteStickers)
            .putFloat("font", patch.fontScale)
            .putInt("radius", patch.radius)
            .putString("title", patch.coupleTitle)
            .apply()
        _state.value = patch
    }

    fun patch(block: (AppearanceState) -> AppearanceState) {
        val next = block(_state.value)
        update(next)
    }
}
