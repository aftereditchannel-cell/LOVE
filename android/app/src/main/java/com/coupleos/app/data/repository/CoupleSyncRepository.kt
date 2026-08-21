package com.coupleos.app.data.repository

import android.util.Log
import com.coupleos.app.data.local.dao.*
import com.coupleos.app.data.local.entity.*
import com.coupleos.app.security.keystore.SecureStorage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.time.LocalDateTime
import javax.inject.Inject
import javax.inject.Singleton

/**
 * The whole application state, serialised into one JSON document that lives
 * inside the CoupleOS Gist of each partner.
 */
@Serializable
data class CoupleSnapshot(
    val schema: Int = 2,
    val author: String = "",
    val authorRole: String = "",
    val updatedAt: String = "",
    val coupleName: String = "",
    val startDate: String = "",
    val users: List<UserEntity> = emptyList(),
    val couples: List<CoupleEntity> = emptyList(),
    val moods: List<MoodEntity> = emptyList(),
    val memories: List<MemoryEntity> = emptyList(),
    val journal: List<JournalEntity> = emptyList(),
    val messages: List<MessageEntity> = emptyList(),
    val events: List<CalendarEventEntity> = emptyList(),
    val tasks: List<TaskEntity> = emptyList(),
    val wishlist: List<WishlistEntity> = emptyList(),
    val bucketList: List<BucketItemEntity> = emptyList(),
    val letters: List<LoveLetterEntity> = emptyList(),
    val surprises: List<SurpriseEntity> = emptyList(),
    val countdowns: List<CountdownEntity> = emptyList(),
    val expenses: List<ExpenseEntity> = emptyList(),
    val timeline: List<TimelineEventEntity> = emptyList(),
    val questions: List<DailyQuestionEntity> = emptyList(),
    val answers: List<QuestionAnswerEntity> = emptyList(),
    val checkins: List<RelationshipCheckinEntity> = emptyList(),
)

data class SyncResult(
    val ok: Boolean,
    val message: String,
    val pushed: Int = 0,
    val pulled: Int = 0,
)

data class SyncState(
    val isSyncing: Boolean = false,
    val lastSyncAt: String? = null,
    val lastMessage: String? = null,
    val lastOk: Boolean? = null,
)

/**
 * Bidirectional synchronisation between Room and the two GitHub Gists.
 *
 * push  : local Room  ->  my gist (coupleos_snapshot.json)
 * pull  : my gist + partner gist  ->  merged  ->  Room
 * sync  : pull then push, so both sides converge.
 *
 * Conflict resolution is last-write-wins per record id, using `updatedAt`
 * (falling back to `createdAt`) as the version stamp.
 */
@Singleton
class CoupleSyncRepository @Inject constructor(
    private val gitHubRepository: GitHubRepository,
    private val secureStorage: SecureStorage,
    private val json: Json,
    private val userDao: UserDao,
    private val coupleDao: CoupleDao,
    private val moodDao: MoodDao,
    private val memoryDao: MemoryDao,
    private val journalDao: JournalDao,
    private val messageDao: MessageDao,
    private val calendarDao: CalendarDao,
    private val taskDao: TaskDao,
    private val wishlistDao: WishlistDao,
    private val bucketItemDao: BucketItemDao,
    private val loveLetterDao: LoveLetterDao,
    private val surpriseDao: SurpriseDao,
    private val countdownDao: CountdownDao,
    private val expenseDao: ExpenseDao,
    private val timelineDao: TimelineDao,
    private val dailyQuestionDao: DailyQuestionDao,
    private val relationshipCheckinDao: RelationshipCheckinDao,
) {
    companion object {
        private const val TAG = "CoupleSync"
    }

    private val mutex = Mutex()

    private val _state = MutableStateFlow(
        SyncState(lastSyncAt = secureStorage.getLastSyncAt())
    )
    val state: StateFlow<SyncState> = _state

    // ── Snapshot building ───────────────────────────────────────────────

    private suspend fun buildLocalSnapshot(): CoupleSnapshot = withContext(Dispatchers.IO) {
        CoupleSnapshot(
            author = secureStorage.getMyGitHubUsername().orEmpty(),
            authorRole = secureStorage.getUserRole().orEmpty(),
            updatedAt = LocalDateTime.now().toString(),
            coupleName = "${secureStorage.getPersonAName()} & ${secureStorage.getPersonBName()}",
            users = userDao.getAllOnce(),
            couples = coupleDao.getAllOnce(),
            moods = moodDao.getAllOnce(),
            memories = memoryDao.getAllOnce(),
            journal = journalDao.getAllOnce(),
            messages = messageDao.getAllOnce(),
            events = calendarDao.getAllOnce(),
            tasks = taskDao.getAllOnce(),
            wishlist = wishlistDao.getAllOnce(),
            bucketList = bucketItemDao.getAllOnce(),
            letters = loveLetterDao.getAllOnce(),
            surprises = surpriseDao.getAllOnce(),
            countdowns = countdownDao.getAllOnce(),
            expenses = expenseDao.getAllOnce(),
            timeline = timelineDao.getAllOnce(),
            questions = dailyQuestionDao.getAllQuestionsOnce(),
            answers = dailyQuestionDao.getAllAnswersOnce(),
            checkins = relationshipCheckinDao.getAllOnce(),
        )
    }

    private fun recordCount(s: CoupleSnapshot): Int =
        s.users.size + s.couples.size + s.moods.size + s.memories.size + s.journal.size +
            s.messages.size + s.events.size + s.tasks.size + s.wishlist.size + s.bucketList.size +
            s.letters.size + s.surprises.size + s.countdowns.size + s.expenses.size +
            s.timeline.size + s.questions.size + s.answers.size + s.checkins.size

    // ── Push ────────────────────────────────────────────────────────────

    /** Serialises everything and stores it on MY token. */
    suspend fun push(): SyncResult = mutex.withLock { pushInternal() }

    private suspend fun pushInternal(): SyncResult {
        if (!secureStorage.isPaired()) {
            return SyncResult(false, "هنوز اتصال برقرار نشده")
        }
        _state.value = _state.value.copy(isSyncing = true)

        return try {
            val snapshot = buildLocalSnapshot()
            val payload = json.encodeToString(CoupleSnapshot.serializer(), snapshot)

            val files = mutableMapOf(
                GitHubRepository.SNAPSHOT_FILE to payload,
                // Readable mirrors so the Gist is browsable on github.com
                GitHubRepository.MOODS_FILE to json.encodeToString(kotlinx.serialization.builtins.ListSerializer(MoodEntity.serializer()), snapshot.moods),
                GitHubRepository.MEMORIES_FILE to json.encodeToString(kotlinx.serialization.builtins.ListSerializer(MemoryEntity.serializer()), snapshot.memories),
                GitHubRepository.MESSAGES_FILE to json.encodeToString(kotlinx.serialization.builtins.ListSerializer(MessageEntity.serializer()), snapshot.messages),
                GitHubRepository.CALENDAR_FILE to json.encodeToString(kotlinx.serialization.builtins.ListSerializer(CalendarEventEntity.serializer()), snapshot.events),
                GitHubRepository.TASKS_FILE to json.encodeToString(kotlinx.serialization.builtins.ListSerializer(TaskEntity.serializer()), snapshot.tasks),
                GitHubRepository.JOURNAL_FILE to json.encodeToString(kotlinx.serialization.builtins.ListSerializer(JournalEntity.serializer()), snapshot.journal),
            )

            val result = gitHubRepository.writeFiles(files)
            if (result.isSuccess) {
                markEverythingSynced()
                val stamp = LocalDateTime.now().toString()
                secureStorage.saveLastSyncAt(stamp)
                val count = recordCount(snapshot)
                _state.value = SyncState(false, stamp, "$count رکورد روی توکن ذخیره شد ✅", true)
                SyncResult(true, "$count رکورد روی توکن ذخیره شد ✅", pushed = count)
            } else {
                val message = result.exceptionOrNull()?.message ?: "ذخیره‌سازی ناموفق"
                _state.value = _state.value.copy(isSyncing = false, lastMessage = message, lastOk = false)
                SyncResult(false, message)
            }
        } catch (e: Exception) {
            Log.e(TAG, "push failed", e)
            val message = "خطا در ذخیره‌سازی: ${e.localizedMessage}"
            _state.value = _state.value.copy(isSyncing = false, lastMessage = message, lastOk = false)
            SyncResult(false, message)
        }
    }

    private suspend fun markEverythingSynced() = withContext(Dispatchers.IO) {
        runCatching { userDao.markAllSynced() }
        runCatching { coupleDao.markAllSynced() }
        runCatching { moodDao.markAllSynced() }
        runCatching { memoryDao.markAllSynced() }
        runCatching { journalDao.markAllSynced() }
        runCatching { messageDao.markAllSynced() }
        runCatching { calendarDao.markAllSynced() }
        runCatching { taskDao.markAllSynced() }
        runCatching { wishlistDao.markAllSynced() }
        runCatching { bucketItemDao.markAllSynced() }
        runCatching { loveLetterDao.markAllSynced() }
        runCatching { surpriseDao.markAllSynced() }
        runCatching { countdownDao.markAllSynced() }
        runCatching { expenseDao.markAllSynced() }
        runCatching { timelineDao.markAllSynced() }
        runCatching { relationshipCheckinDao.markAllSynced() }
        runCatching { dailyQuestionDao.markAllAnswersSynced() }
        Unit
    }

    // ── Pull ────────────────────────────────────────────────────────────

    /** Downloads both snapshots and merges them into Room. */
    suspend fun pull(): SyncResult = mutex.withLock { pullInternal() }

    private suspend fun pullInternal(): SyncResult {
        if (!secureStorage.isPaired()) {
            return SyncResult(false, "هنوز اتصال برقرار نشده")
        }
        _state.value = _state.value.copy(isSyncing = true)

        val remotes = mutableListOf<CoupleSnapshot>()
        val problems = mutableListOf<String>()

        val myToken = secureStorage.getPersonalToken()
        if (myToken != null) {
            readSnapshot(myToken, isMine = true)
                .onSuccess { remotes.add(it) }
                .onFailure { problems.add("خودم: ${it.message}") }
        }

        val partnerToken = secureStorage.getPartnerToken()
        if (partnerToken != null) {
            readSnapshot(partnerToken, isMine = false)
                .onSuccess { remotes.add(it) }
                .onFailure { problems.add("پارتنر: ${it.message}") }
        }

        if (remotes.isEmpty()) {
            val message = "چیزی برای دریافت پیدا نشد" +
                if (problems.isEmpty()) "" else " — ${problems.joinToString(" | ")}"
            _state.value = _state.value.copy(isSyncing = false, lastMessage = message, lastOk = false)
            return SyncResult(false, message)
        }

        return try {
            val local = buildLocalSnapshot()
            val merged = mergeSnapshots(local, remotes)
            applySnapshot(merged)

            val stamp = LocalDateTime.now().toString()
            secureStorage.saveLastSyncAt(stamp)
            val count = recordCount(merged)
            val message = "$count رکورد از توکن‌ها دریافت و ادغام شد ✅" +
                if (problems.isEmpty()) "" else " (${problems.joinToString(" | ")})"
            _state.value = SyncState(false, stamp, message, true)
            SyncResult(true, message, pulled = count)
        } catch (e: Exception) {
            Log.e(TAG, "pull failed", e)
            val message = "خطا در ادغام داده: ${e.localizedMessage}"
            _state.value = _state.value.copy(isSyncing = false, lastMessage = message, lastOk = false)
            SyncResult(false, message)
        }
    }

    private suspend fun readSnapshot(token: String, isMine: Boolean): Result<CoupleSnapshot> {
        val raw = gitHubRepository.readFile(token, isMine, GitHubRepository.SNAPSHOT_FILE)
        val content = raw.getOrElse { return Result.failure(it) }
        if (content.isBlank() || content.trim() == "{}") return Result.success(CoupleSnapshot())
        return runCatching { json.decodeFromString(CoupleSnapshot.serializer(), content) }
    }

    // ── Merge ───────────────────────────────────────────────────────────

    private fun <T> mergeBy(
        lists: List<List<T>>,
        id: (T) -> String,
        stamp: (T) -> String,
    ): List<T> {
        val winners = LinkedHashMap<String, T>()
        lists.forEach { list ->
            list.forEach { item ->
                val key = id(item)
                val current = winners[key]
                if (current == null || stamp(item) >= stamp(current)) {
                    winners[key] = item
                }
            }
        }
        return winners.values.toList()
    }

    private fun mergeSnapshots(local: CoupleSnapshot, remotes: List<CoupleSnapshot>): CoupleSnapshot {
        val all = listOf(local) + remotes
        return CoupleSnapshot(
            author = local.author,
            authorRole = local.authorRole,
            updatedAt = LocalDateTime.now().toString(),
            coupleName = local.coupleName,
            startDate = all.mapNotNull { it.startDate.ifBlank { null } }.firstOrNull().orEmpty(),
            users = mergeBy(all.map { it.users }, { it.id }, { it.updatedAt }),
            couples = mergeBy(all.map { it.couples }, { it.id }, { it.updatedAt }),
            moods = mergeBy(all.map { it.moods }, { it.id }, { it.createdAt }),
            memories = mergeBy(all.map { it.memories }, { it.id }, { it.updatedAt }),
            journal = mergeBy(all.map { it.journal }, { it.id }, { it.updatedAt }),
            messages = mergeBy(all.map { it.messages }, { it.id }, { it.updatedAt }),
            events = mergeBy(all.map { it.events }, { it.id }, { it.updatedAt }),
            tasks = mergeBy(all.map { it.tasks }, { it.id }, { it.updatedAt }),
            wishlist = mergeBy(all.map { it.wishlist }, { it.id }, { it.updatedAt }),
            bucketList = mergeBy(all.map { it.bucketList }, { it.id }, { it.updatedAt }),
            letters = mergeBy(all.map { it.letters }, { it.id }, { it.createdAt }),
            surprises = mergeBy(all.map { it.surprises }, { it.id }, { it.createdAt }),
            countdowns = mergeBy(all.map { it.countdowns }, { it.id }, { it.createdAt }),
            expenses = mergeBy(all.map { it.expenses }, { it.id }, { it.createdAt }),
            timeline = mergeBy(all.map { it.timeline }, { it.id }, { it.createdAt }),
            questions = mergeBy(all.map { it.questions }, { it.id }, { it.date }),
            answers = mergeBy(all.map { it.answers }, { it.id }, { it.createdAt }),
            checkins = mergeBy(all.map { it.checkins }, { it.id }, { it.createdAt }),
        )
    }

    private suspend fun applySnapshot(s: CoupleSnapshot) = withContext(Dispatchers.IO) {
        s.users.forEach { userDao.insert(it) }
        s.couples.forEach { coupleDao.insert(it) }
        s.moods.forEach { moodDao.insert(it.copy(isSynced = true)) }
        s.memories.forEach { memoryDao.insert(it.copy(isSynced = true)) }
        s.journal.forEach { journalDao.insert(it.copy(isSynced = true)) }
        s.messages.forEach { messageDao.insert(it.copy(isSynced = true)) }
        s.events.forEach { calendarDao.insert(it.copy(isSynced = true)) }
        s.tasks.forEach { taskDao.insert(it.copy(isSynced = true)) }
        s.wishlist.forEach { wishlistDao.insert(it.copy(isSynced = true)) }
        s.bucketList.forEach { bucketItemDao.insert(it.copy(isSynced = true)) }
        s.letters.forEach { loveLetterDao.insert(it.copy(isSynced = true)) }
        s.surprises.forEach { surpriseDao.insert(it.copy(isSynced = true)) }
        s.countdowns.forEach { countdownDao.insert(it.copy(isSynced = true)) }
        s.expenses.forEach { expenseDao.insert(it.copy(isSynced = true)) }
        s.timeline.forEach { timelineDao.insert(it.copy(isSynced = true)) }
        s.questions.forEach { dailyQuestionDao.insert(it) }
        s.answers.forEach { dailyQuestionDao.insertAnswer(it.copy(isSynced = true)) }
        s.checkins.forEach { relationshipCheckinDao.insert(it.copy(isSynced = true)) }
        Unit
    }

    // ── Full sync ───────────────────────────────────────────────────────

    /** Pull first (so we never overwrite the partner), then push the merge. */
    suspend fun sync(): SyncResult = mutex.withLock {
        val pulled = pullInternal()
        val pushed = pushInternal()
        when {
            pushed.ok && pulled.ok ->
                SyncResult(true, "همگام‌سازی کامل شد ✅ (${pulled.pulled} دریافت، ${pushed.pushed} ارسال)", pushed.pushed, pulled.pulled)
            pushed.ok ->
                SyncResult(true, "روی توکن ذخیره شد ✅ — دریافت ناقص: ${pulled.message}", pushed.pushed, 0)
            else ->
                SyncResult(false, pushed.message)
        }
    }

    /** Fire-and-forget push used after every local write. */
    suspend fun pushQuietly() {
        if (!secureStorage.isAutoSyncEnabled()) return
        if (!secureStorage.isPaired()) return
        runCatching { push() }
    }

    fun lastSyncAt(): String? = secureStorage.getLastSyncAt()
}
