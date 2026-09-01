package com.coupleos.app.data.local

import android.content.Context
import android.util.Base64
import com.coupleos.app.data.repository.GitHubRepository
import com.coupleos.app.security.keystore.SecureStorage
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
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
data class PhotoItem(val id: String, val src: String, val title: String, val date: String, val data: String = "")

@Serializable
data class PetState(
    val type: String = "bunny",
    val name: String = "نی‌نی",
    val hunger: Int = 70,
    val love: Int = 80,
)

@Serializable
data class MemCard(val emoji: String, val flipped: Boolean = false, val matched: Boolean = false)

@Serializable
data class GamePlay(
    val plays: Int = 0,
    val memoryMovesBest: Int = 0,
    val catchBest: Int = 0,
    val tttMe: Int = 0,
    val tttPartner: Int = 0,
    val rpsMe: Int = 0,
    val rpsPartner: Int = 0,
    val memCards: List<MemCard> = emptyList(),
    val memFirst: Int = -1,
    val memMoves: Int = 0,
    val memMatched: Int = 0,
    val memWon: Boolean = false,
    val memLock: Boolean = false,
    val tttBoard: List<String> = listOf("", "", "", "", "", "", "", "", ""),
    val tttTurn: String = "me",
    val tttWinner: String = "",
    val tttMode: String = "hotseat",
    val tttStarted: Boolean = false,
    val rpsMeChoice: String = "",
    val rpsPartnerChoice: String = "",
    val rpsResult: String = "",
    val quizIndex: Int = 0,
    val quizMy: Int = -1,
    val quizPartner: Int = -1,
    val quizRevealed: Boolean = false,
    val quizMatches: Int = 0,
)

@Serializable
data class TttShare(val board: List<String>, val turn: String, val mode: String, val winner: String? = null)

@Serializable
data class RpsShare(val me: String? = null, val partner: String? = null, val result: String? = null)

@Serializable
data class QuizShare(val index: Int = 0, val my: Int? = null, val partner: Int? = null, val revealed: Boolean = false, val matches: Int = 0)

@Serializable
data class DuoShare(val tttMe: Int = 0, val tttPartner: Int = 0, val rpsMe: Int = 0, val rpsPartner: Int = 0)

@Serializable
data class PlayShare(val ttt: TttShare? = null, val rps: RpsShare? = null, val quiz: QuizShare? = null, val duo: DuoShare? = null)

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
    val play: GamePlay = GamePlay(),
    val rev: Long = 0,
)

@Singleton
class ExtraStore @Inject constructor(
    @ApplicationContext context: Context,
    private val repo: GitHubRepository,
    private val secureStorage: SecureStorage,
) {
    private val prefs = context.getSharedPreferences("couple_os_extra", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val _bundle = MutableStateFlow(read())
    val bundle: StateFlow<ExtraBundle> = _bundle

    init {
        // Pull the cute extras from the couple token so nothing is device-local only.
        pullFromToken()
    }

    private fun read(): ExtraBundle {
        val raw = prefs.getString("bundle", null) ?: return ExtraBundle()
        return try { json.decodeFromString(ExtraBundle.serializer(), raw) } catch (_: Exception) { ExtraBundle() }
    }

    private fun persist(next: ExtraBundle) {
        val stamped = next.copy(rev = System.currentTimeMillis())
        prefs.edit().putString("bundle", json.encodeToString(ExtraBundle.serializer(), stamped)).apply()
        _bundle.value = stamped
        pushToToken(stamped)
    }

    // ── GitHub token sync ─────────────────────────────────────
    // extras.json holds the whole bundle (except photos), photos.json holds the
    // photo list separately so a large photo can never corrupt the rest.
    private fun pushToToken(bundle: ExtraBundle) {
        if (!secureStorage.isPaired()) return
        scope.launch {
            try {
                val extrasPayload = bundle.copy(photos = emptyList())
                repo.saveToGist(GitHubRepository.EXTRAS_FILE, json.encodeToString(ExtraBundle.serializer(), extrasPayload))
                repo.saveToGist(GitHubRepository.PHOTOS_FILE, json.encodeToString(bundle.photos))
            } catch (_: Throwable) {
                // Network/offline — local copy is the source of truth; next change re-pushes.
            }
        }
    }

    private fun pullFromToken() {
        scope.launch {
            try {
                if (!secureStorage.isPaired()) return@launch
                // Merge the extras bundle (last-write-wins by rev).
                repo.readRawContent(GitHubRepository.EXTRAS_FILE).getOrNull()?.let { raw ->
                    runCatching { json.decodeFromString<ExtraBundle>(raw) }.getOrNull()?.let { remote ->
                        val local = _bundle.value
                        if (remote.rev > local.rev) {
                            val merged = remote.copy(photos = local.photos)
                            prefs.edit().putString("bundle", json.encodeToString(ExtraBundle.serializer(), merged)).apply()
                            _bundle.value = merged
                        }
                    }
                }
                // Merge the photo list (by id) from the token.
                repo.readMergedContent(GitHubRepository.PHOTOS_FILE).getOrNull()?.let { raw ->
                    runCatching { json.decodeFromString<List<PhotoItem>>(raw) }.getOrNull()?.let { remotePhotos ->
                        if (remotePhotos.isNotEmpty()) {
                            val local = _bundle.value
                            val localIds = local.photos.map { it.id }.toSet()
                            val merged = local.photos + remotePhotos.filter { it.id !in localIds }
                            val next = local.copy(photos = merged)
                            prefs.edit().putString("bundle", json.encodeToString(ExtraBundle.serializer(), next)).apply()
                            _bundle.value = next
                        }
                    }
                }
            } catch (_: Throwable) {
                // Never let a sync failure crash the app.
            }
        }
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

    fun addPhoto(src: String, title: String, data: String = "") {
        persist(_bundle.value.copy(photos = listOf(PhotoItem(UUID.randomUUID().toString(), src, title, LocalDate.now().toString(), data)) + _bundle.value.photos))
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

    private fun play(): GamePlay = _bundle.value.play
    private fun savePlay(p: GamePlay) = persist(_bundle.value.copy(play = p))
    private fun bump(p: GamePlay) = p.copy(plays = p.plays + 1)

    fun startMemory() {
        val emojis = listOf("💗", "🌸", "🍓", "🧸", "🐰", "🎀", "✨", "🧁")
        val cards = (emojis + emojis).shuffled().map { MemCard(it) }
        savePlay(play().copy(memCards = cards, memFirst = -1, memMoves = 0, memMatched = 0, memWon = false, memLock = false))
    }

    fun flipMemory(index: Int) {
        val g = play()
        if (g.memWon || g.memLock) return
        val cards = g.memCards.toMutableList()
        val card = cards.getOrNull(index) ?: return
        if (card.flipped || card.matched) return
        cards[index] = card.copy(flipped = true)
        if (g.memFirst < 0) {
            savePlay(g.copy(memCards = cards, memFirst = index))
            return
        }
        val first = cards.getOrNull(g.memFirst) ?: return
        val moves = g.memMoves + 1
        if (first.emoji == card.emoji && g.memFirst != index) {
            cards[g.memFirst] = first.copy(matched = true, flipped = true)
            cards[index] = cards[index].copy(matched = true, flipped = true)
            val matched = g.memMatched + 1
            val won = matched >= 8
            val best = if (won && (g.memoryMovesBest == 0 || moves < g.memoryMovesBest)) moves else g.memoryMovesBest
            var next = g.copy(memCards = cards, memFirst = -1, memMoves = moves, memMatched = matched, memWon = won, memLock = false, memoryMovesBest = best)
            if (won) next = bump(next)
            savePlay(next)
            return
        }
        savePlay(g.copy(memCards = cards, memMoves = moves, memLock = true))
    }

    fun memoryUnflip() {
        val g = play()
        savePlay(g.copy(memCards = g.memCards.map { if (it.matched) it else it.copy(flipped = false) }, memFirst = -1, memLock = false))
    }

    fun saveCatchScore(score: Int) {
        val g = play()
        val best = maxOf(g.catchBest, score)
        savePlay(bump(g.copy(catchBest = best)))
    }

    fun startTtt(mode: String = "hotseat") {
        savePlay(play().copy(tttBoard = List(9) { "" }, tttTurn = "me", tttWinner = "", tttMode = mode, tttStarted = true))
    }

    fun playTtt(index: Int) {
        val g = play()
        if (!g.tttStarted || g.tttWinner.isNotEmpty()) return
        if (index !in 0..8 || g.tttBoard[index].isNotEmpty()) return
        val board = g.tttBoard.toMutableList()
        board[index] = g.tttTurn
        var winner = boardWinner(board)
        var turn = if (winner.isEmpty()) if (g.tttTurn == "me") "partner" else "me" else g.tttTurn
        if (winner.isEmpty() && g.tttMode == "cpu" && turn == "partner") {
            val empty = board.indices.filter { board[it].isEmpty() }
            if (empty.isNotEmpty()) {
                board[empty.random()] = "partner"
                winner = boardWinner(board)
                if (winner.isEmpty()) turn = "me"
            }
        }
        var next = g.copy(tttBoard = board, tttTurn = turn, tttWinner = winner)
        if (winner == "me") next = next.copy(tttMe = next.tttMe + 1)
        if (winner == "partner") next = next.copy(tttPartner = next.tttPartner + 1)
        if (winner.isNotEmpty()) next = bump(next)
        savePlay(next)
    }

    fun startRps() {
        savePlay(play().copy(rpsMeChoice = "", rpsPartnerChoice = "", rpsResult = ""))
    }

    fun lockRps(who: String, choice: String) {
        var g = play()
        if (g.rpsResult.isNotEmpty()) return
        g = if (who == "partner") g.copy(rpsPartnerChoice = choice) else g.copy(rpsMeChoice = choice)
        if (g.rpsMeChoice.isNotEmpty() && g.rpsPartnerChoice.isNotEmpty()) {
            val r = cuteRps(g.rpsMeChoice, g.rpsPartnerChoice)
            val result = if (r == 0) "draw" else if (r > 0) "me" else "partner"
            g = g.copy(rpsResult = result)
            if (result == "me") g = g.copy(rpsMe = g.rpsMe + 1)
            if (result == "partner") g = g.copy(rpsPartner = g.rpsPartner + 1)
            g = bump(g)
        }
        savePlay(g)
    }

    fun startQuiz() {
        savePlay(play().copy(quizIndex = 0, quizMy = -1, quizPartner = -1, quizRevealed = false, quizMatches = 0))
    }

    fun answerQuiz(who: String, option: Int) {
        var g = play()
        if (g.quizRevealed) return
        g = if (who == "partner") g.copy(quizPartner = option) else g.copy(quizMy = option)
        if (g.quizMy >= 0 && g.quizPartner >= 0) {
            val match = if (g.quizMy == g.quizPartner) g.quizMatches + 1 else g.quizMatches
            g = g.copy(quizRevealed = true, quizMatches = match)
        }
        savePlay(g)
    }

    fun nextQuiz() {
        val g = play()
        savePlay(bump(g.copy(quizIndex = (g.quizIndex + 1) % 6, quizMy = -1, quizPartner = -1, quizRevealed = false)))
    }

    fun bumpTruth() = savePlay(bump(play()))

    fun exportPlayCode(): String {
        return try {
            val g = play()
            val share = PlayShare(
                ttt = if (g.tttStarted) TttShare(g.tttBoard, g.tttTurn, g.tttMode, g.tttWinner.ifBlank { null }) else null,
                rps = RpsShare(g.rpsMeChoice.ifBlank { null }, g.rpsPartnerChoice.ifBlank { null }, g.rpsResult.ifBlank { null }),
                quiz = QuizShare(g.quizIndex, g.quizMy.takeIf { it >= 0 }, g.quizPartner.takeIf { it >= 0 }, g.quizRevealed, g.quizMatches),
                duo = DuoShare(g.tttMe, g.tttPartner, g.rpsMe, g.rpsPartner),
            )
            val raw = json.encodeToString(PlayShare.serializer(), share)
            Base64.encodeToString(raw.toByteArray(Charsets.UTF_8), Base64.NO_WRAP)
        } catch (_: Exception) {
            ""
        }
    }

    fun importPlayCode(code: String): Boolean {
        return try {
            val trimmed = code.trim()
            if (trimmed.isEmpty()) return false
            val raw = String(Base64.decode(trimmed, Base64.DEFAULT), Charsets.UTF_8)
            val share = json.decodeFromString(PlayShare.serializer(), raw)
            var p = play()
            share.ttt?.let { p = p.copy(tttBoard = it.board, tttTurn = it.turn, tttMode = it.mode, tttWinner = it.winner ?: "", tttStarted = true) }
            share.rps?.let { p = p.copy(rpsMeChoice = it.me.orEmpty(), rpsPartnerChoice = it.partner.orEmpty(), rpsResult = it.result.orEmpty()) }
            share.quiz?.let { p = p.copy(quizIndex = it.index, quizMy = it.my ?: -1, quizPartner = it.partner ?: -1, quizRevealed = it.revealed, quizMatches = it.matches) }
            share.duo?.let { p = p.copy(tttMe = it.tttMe, tttPartner = it.tttPartner, rpsMe = it.rpsMe, rpsPartner = it.rpsPartner) }
            savePlay(p)
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun boardWinner(board: List<String>): String {
        val lines = arrayOf(
            intArrayOf(0, 1, 2), intArrayOf(3, 4, 5), intArrayOf(6, 7, 8),
            intArrayOf(0, 3, 6), intArrayOf(1, 4, 7), intArrayOf(2, 5, 8),
            intArrayOf(0, 4, 8), intArrayOf(2, 4, 6),
        )
        for (l in lines) {
            val a = board.getOrElse(l[0]) { "" }
            if (a.isNotEmpty() && a == board.getOrElse(l[1]) { "" } && a == board.getOrElse(l[2]) { "" }) return a
        }
        return if (board.all { it.isNotEmpty() }) "draw" else ""
    }

    private fun cuteRps(a: String, b: String): Int {
        if (a == b) return 0
        if ((a == "flower" && b == "teddy") || (a == "teddy" && b == "bow") || (a == "bow" && b == "flower")) return 1
        return -1
    }
}
