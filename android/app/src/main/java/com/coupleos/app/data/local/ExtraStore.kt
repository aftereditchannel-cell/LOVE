package com.coupleos.app.data.local

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.LocalDate
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
data class StickyNote(val id: String, val text: String, val color: String, val createdAt: String)

@Serializable
data class HabitItem(val id: String, val title: String, val emoji: String, val streak: Int, val last: String, val history: List<String>)

@Serializable
data class SongItem(val id: String, val title: String, val artist: String, val note: String)

@Serializable
data class DatePlan(val id: String, val title: String, val desc: String, val emoji: String, val whenText: String)

@Serializable
data class PhotoItem(val id: String, val src: String, val title: String, val date: String)

@Serializable
data class PetState(
    val type: String = "bunny",
    val name: String = "نی‌نی",
    val hunger: Int = 70,
    val love: Int = 80,
)

@Serializable
data class ExtraBundle(
    val notes: List<StickyNote> = emptyList(),
    val habits: List<HabitItem> = emptyList(),
    val songs: List<SongItem> = emptyList(),
    val dates: List<DatePlan> = emptyList(),
    val photos: List<PhotoItem> = emptyList(),
    val kissesSent: Int = 0,
    val kissesReceived: Int = 0,
    val pet: PetState = PetState(),
    val compliments: List<StickyNote> = emptyList(),
)

@Singleton
class ExtraStore @Inject constructor(
    @ApplicationContext context: Context,
) {
    private val prefs = context.getSharedPreferences("couple_os_extra", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val _bundle = MutableStateFlow(read())
    val bundle: StateFlow<ExtraBundle> = _bundle

    private fun read(): ExtraBundle {
        val raw = prefs.getString("bundle", null) ?: return ExtraBundle()
        return try { json.decodeFromString(raw) } catch (_: Exception) { ExtraBundle() }
    }

    private fun persist(next: ExtraBundle) {
        prefs.edit().putString("bundle", json.encodeToString(next)).apply()
        _bundle.value = next
    }

    fun addNote(text: String, color: String = "rose") {
        val n = StickyNote(UUID.randomUUID().toString(), text, color, LocalDate.now().toString())
        persist(_bundle.value.copy(notes = listOf(n) + _bundle.value.notes))
    }
    fun removeNote(id: String) = persist(_bundle.value.copy(notes = _bundle.value.notes.filter { it.id != id }))

    fun addHabit(title: String, emoji: String) {
        val h = HabitItem(UUID.randomUUID().toString(), title, emoji, 0, "", emptyList())
        persist(_bundle.value.copy(habits = listOf(h) + _bundle.value.habits))
    }
    fun tickHabit(id: String) {
        val today = LocalDate.now().toString()
        persist(_bundle.value.copy(habits = _bundle.value.habits.map { h ->
            if (h.id != id) h
            else if (h.last == today) h.copy(last = h.history.lastOrNull() ?: "", streak = (h.streak - 1).coerceAtLeast(0), history = h.history.dropLast(1))
            else h.copy(last = today, streak = h.streak + 1, history = h.history + today)
        }))
    }

    fun addSong(title: String, artist: String, note: String) {
        persist(_bundle.value.copy(songs = listOf(SongItem(UUID.randomUUID().toString(), title, artist, note)) + _bundle.value.songs))
    }
    fun removeSong(id: String) = persist(_bundle.value.copy(songs = _bundle.value.songs.filter { it.id != id }))

    fun addDate(title: String, desc: String, emoji: String, whenText: String) {
        persist(_bundle.value.copy(dates = listOf(DatePlan(UUID.randomUUID().toString(), title, desc, emoji, whenText)) + _bundle.value.dates))
    }
    fun removeDate(id: String) = persist(_bundle.value.copy(dates = _bundle.value.dates.filter { it.id != id }))

    fun addPhoto(src: String, title: String) {
        persist(_bundle.value.copy(photos = listOf(PhotoItem(UUID.randomUUID().toString(), src, title, LocalDate.now().toString())) + _bundle.value.photos))
    }
    fun removePhoto(id: String) = persist(_bundle.value.copy(photos = _bundle.value.photos.filter { it.id != id }))

    fun sendKiss() = persist(_bundle.value.copy(kissesSent = _bundle.value.kissesSent + 1))
    fun receiveKiss() = persist(_bundle.value.copy(kissesReceived = _bundle.value.kissesReceived + 1))

    fun feedPet() {
        val p = _bundle.value.pet
        persist(_bundle.value.copy(pet = p.copy(hunger = (p.hunger + 18).coerceAtMost(100), love = (p.love + 6).coerceAtMost(100))))
    }
    fun petPet() {
        val p = _bundle.value.pet
        persist(_bundle.value.copy(pet = p.copy(love = (p.love + 10).coerceAtMost(100))))
    }
    fun setPetType(type: String) = persist(_bundle.value.copy(pet = _bundle.value.pet.copy(type = type)))

    fun addCompliment(text: String) {
        val n = StickyNote(UUID.randomUUID().toString(), text, "rose", LocalDate.now().toString())
        persist(_bundle.value.copy(compliments = listOf(n) + _bundle.value.compliments))
    }
}
