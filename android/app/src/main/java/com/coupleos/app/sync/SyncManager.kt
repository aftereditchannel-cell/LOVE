package com.coupleos.app.sync

import com.coupleos.app.data.local.dao.*
import com.coupleos.app.data.local.entity.*
import com.coupleos.app.data.repository.GitHubRepository
import com.coupleos.app.security.keystore.SecureStorage
import com.coupleos.app.ui.bucket.BucketSyncData
import com.coupleos.app.ui.calendar.CalendarSyncData
import com.coupleos.app.ui.chat.MessageSyncData
import com.coupleos.app.ui.countdown.CountdownSyncData
import com.coupleos.app.ui.expenses.ExpenseSyncData
import com.coupleos.app.ui.journal.JournalSyncData
import com.coupleos.app.ui.letters.LetterSyncData
import com.coupleos.app.ui.memories.MemorySyncData
import com.coupleos.app.ui.mood.MoodSyncData
import com.coupleos.app.ui.questions.AnswerSyncData
import com.coupleos.app.ui.surprises.SurpriseSyncData
import com.coupleos.app.ui.tasks.TaskSyncData
import com.coupleos.app.ui.wishlist.WishlistSyncData
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Global sync engine.
 *
 * Pulls ALL data from both tokens' gists into the local Room database, and pushes
 * any local-only (unsynced) data back to the gists. Called on app launch and on
 * manual refresh so the partner's data appears automatically without visiting
 * every screen.
 */
@Singleton
class SyncManager @Inject constructor(
    private val repo: GitHubRepository,
    private val storage: SecureStorage,
    private val json: Json,
    private val moodDao: MoodDao,
    private val memoryDao: MemoryDao,
    private val messageDao: MessageDao,
    private val calendarDao: CalendarDao,
    private val taskDao: TaskDao,
    private val journalDao: JournalDao,
    private val wishlistDao: WishlistDao,
    private val bucketItemDao: BucketItemDao,
    private val loveLetterDao: LoveLetterDao,
    private val countdownDao: CountdownDao,
    private val dailyQuestionDao: DailyQuestionDao,
    private val expenseDao: ExpenseDao,
    private val surpriseDao: SurpriseDao,
) {
    data class SyncResult(
        val pulledCount: Int = 0,
        val error: String? = null,
    )

    /**
     * Pull every file from both gists and upsert into local Room.
     * Returns the number of remote items applied (or a best-effort count).
     */
    suspend fun pullAll(): SyncResult {
        if (!storage.isPaired()) return SyncResult(0)
        var applied = 0
        var lastError: String? = null

        fun <T> decode(remote: String?, decoder: (String) -> List<T>): List<T> {
            if (remote.isNullOrBlank() || remote == "[]") return emptyList()
            return try { decoder(remote) } catch (_: Exception) { emptyList() }
        }

        // Moods
        try {
            val remote = repo.readMergedContent(GitHubRepository.MOODS_FILE).getOrNull()
            val list = decode(remote) { json.decodeFromString<List<MoodSyncData>>(it) }
            for (i in list) {
                if (moodDao.getMoodByDate(i.userId, i.date) == null) {
                    moodDao.insert(MoodEntity(
                        id = i.id.ifEmpty { java.util.UUID.randomUUID().toString() },
                        userId = i.userId, mood = i.mood, energy = i.energy, stress = i.stress,
                        sleep = i.sleep, loveLevel = i.loveLevel, socialBattery = i.socialBattery,
                        note = i.note, date = i.date, createdAt = i.createdAt, isSynced = true
                    ))
                    applied++
                }
            }
        } catch (e: Exception) { lastError = e.localizedMessage }

        // Memories
        try {
            val remote = repo.readMergedContent(GitHubRepository.MEMORIES_FILE).getOrNull()
            val list = decode(remote) { json.decodeFromString<List<MemorySyncData>>(it) }
            for (i in list) {
                if (memoryDao.getMemoryById(i.id) == null) {
                    memoryDao.insert(MemoryEntity(
                        id = i.id, title = i.title, description = i.description, date = i.date,
                        location = i.location, privacy = i.privacy, createdBy = "",
                        isFavorite = i.isFavorite, createdAt = i.createdAt, updatedAt = i.createdAt,
                        isSynced = true
                    ))
                    applied++
                }
            }
        } catch (e: Exception) { lastError = e.localizedMessage }

        // Messages
        try {
            val remote = repo.readMergedContent(GitHubRepository.MESSAGES_FILE).getOrNull()
            val list = decode(remote) { json.decodeFromString<List<MessageSyncData>>(it) }
            for (i in list) {
                if (messageDao.getMessageById(i.id) == null) {
                    messageDao.insert(MessageEntity(
                        id = i.id, coupleId = i.coupleId, senderId = i.senderId, content = i.content,
                        type = i.type, createdAt = i.createdAt, updatedAt = i.createdAt, isSynced = true
                    ))
                    applied++
                }
            }
        } catch (e: Exception) { lastError = e.localizedMessage }

        // Calendar
        try {
            val remote = repo.readMergedContent(GitHubRepository.CALENDAR_FILE).getOrNull()
            val list = decode(remote) { json.decodeFromString<List<CalendarSyncData>>(it) }
            for (i in list) {
                if (calendarDao.getEventById(i.id) == null) {
                    calendarDao.insert(CalendarEventEntity(
                        id = i.id, title = i.title, description = i.description, date = i.date,
                        endDate = i.endDate, type = i.type, isRecurring = i.isRecurring,
                        hasReminder = i.hasReminder, reminderMinutes = i.reminderMinutes,
                        createdBy = i.createdBy, createdAt = i.createdAt, updatedAt = i.createdAt,
                        isSynced = true
                    ))
                    applied++
                }
            }
        } catch (e: Exception) { lastError = e.localizedMessage }

        // Tasks
        try {
            val remote = repo.readMergedContent(GitHubRepository.TASKS_FILE).getOrNull()
            val list = decode(remote) { json.decodeFromString<List<TaskSyncData>>(it) }
            for (i in list) {
                if (taskDao.getTaskById(i.id) == null) {
                    taskDao.insert(TaskEntity(
                        id = i.id, title = i.title, description = i.description, dueDate = i.dueDate,
                        priority = i.priority, assignedTo = i.assignedTo, status = i.status,
                        createdBy = i.createdBy, createdAt = i.createdAt, updatedAt = i.createdAt,
                        isSynced = true
                    ))
                    applied++
                }
            }
        } catch (e: Exception) { lastError = e.localizedMessage }

        // Journal
        try {
            val remote = repo.readMergedContent(GitHubRepository.JOURNAL_FILE).getOrNull()
            val list = decode(remote) { json.decodeFromString<List<JournalSyncData>>(it) }
            for (i in list) {
                if (journalDao.getEntryById(i.id) == null) {
                    journalDao.insert(JournalEntity(
                        id = i.id, title = i.title, content = i.content, mood = i.mood, date = i.date,
                        privacy = i.privacy, createdBy = i.createdBy, createdAt = i.createdAt,
                        updatedAt = i.createdAt, isSynced = true
                    ))
                    applied++
                }
            }
        } catch (e: Exception) { lastError = e.localizedMessage }

        // Wishlist
        try {
            val remote = repo.readMergedContent(GitHubRepository.WISHLIST_FILE).getOrNull()
            val list = decode(remote) { json.decodeFromString<List<WishlistSyncData>>(it) }
            for (i in list) {
                wishlistDao.insert(WishlistEntity(
                    id = i.id, title = i.title, description = i.description, category = i.category,
                    privacy = i.privacy, isCompleted = i.isCompleted, createdBy = i.createdBy,
                    createdAt = i.createdAt, updatedAt = i.createdAt, isSynced = true
                ))
                applied++
            }
        } catch (e: Exception) { lastError = e.localizedMessage }

        // Bucket list
        try {
            val remote = repo.readMergedContent(GitHubRepository.BUCKET_FILE).getOrNull()
            val list = decode(remote) { json.decodeFromString<List<BucketSyncData>>(it) }
            for (i in list) {
                bucketItemDao.insert(BucketItemEntity(
                    id = i.id, title = i.title, description = i.description, isCompleted = i.isCompleted,
                    completedDate = i.completedDate, photoUrl = i.photoUrl, createdBy = i.createdBy,
                    createdAt = i.createdAt, updatedAt = i.createdAt, isSynced = true
                ))
                applied++
            }
        } catch (e: Exception) { lastError = e.localizedMessage }

        // Love letters
        try {
            val remote = repo.readMergedContent(GitHubRepository.LETTERS_FILE).getOrNull()
            val list = decode(remote) { json.decodeFromString<List<LetterSyncData>>(it) }
            for (i in list) {
                loveLetterDao.insert(LoveLetterEntity(
                    id = i.id, title = i.title, content = i.content, openOnDate = i.openOnDate,
                    isOpened = i.isOpened, createdBy = i.createdBy, recipientId = i.recipientId,
                    createdAt = i.createdAt, isSynced = true
                ))
                applied++
            }
        } catch (e: Exception) { lastError = e.localizedMessage }

        // Countdowns
        try {
            val remote = repo.readMergedContent(GitHubRepository.COUNTDOWNS_FILE).getOrNull()
            val list = decode(remote) { json.decodeFromString<List<CountdownSyncData>>(it) }
            for (i in list) {
                countdownDao.insert(CountdownEntity(
                    id = i.id, title = i.title, targetDate = i.targetDate, emoji = i.emoji,
                    createdBy = i.createdBy, createdAt = i.createdAt, isSynced = true
                ))
                applied++
            }
        } catch (e: Exception) { lastError = e.localizedMessage }

        // Question answers
        try {
            val remote = repo.readMergedContent(GitHubRepository.QUESTIONS_FILE).getOrNull()
            val list = decode(remote) { json.decodeFromString<List<AnswerSyncData>>(it) }
            for (i in list) {
                dailyQuestionDao.insertAnswer(QuestionAnswerEntity(
                    id = i.id, questionId = i.questionId, userId = i.userId, answer = i.answer,
                    createdAt = i.createdAt, isSynced = true
                ))
                applied++
            }
        } catch (e: Exception) { lastError = e.localizedMessage }

        // Expenses
        try {
            val remote = repo.readMergedContent(GitHubRepository.EXPENSES_FILE).getOrNull()
            val list = decode(remote) { json.decodeFromString<List<ExpenseSyncData>>(it) }
            for (i in list) {
                expenseDao.insert(ExpenseEntity(
                    id = i.id, amount = i.amount, category = i.category, paidBy = i.paidBy,
                    date = i.date, note = i.note, createdBy = i.paidBy, createdAt = i.createdAt,
                    isSynced = true
                ))
                applied++
            }
        } catch (e: Exception) { lastError = e.localizedMessage }

        // Surprises
        try {
            val remote = repo.readMergedContent(GitHubRepository.SURPRISES_FILE).getOrNull()
            val list = decode(remote) { json.decodeFromString<List<SurpriseSyncData>>(it) }
            for (i in list) {
                surpriseDao.insert(SurpriseEntity(
                    id = i.id, title = i.title, content = i.content, triggerType = i.triggerType,
                    triggerValue = i.triggerValue, isRevealed = i.isRevealed, createdBy = i.createdBy,
                    recipientId = i.recipientId, createdAt = i.createdAt, isSynced = true
                ))
                applied++
            }
        } catch (e: Exception) { lastError = e.localizedMessage }

        if (applied > 0 || lastError == null) {
            storage.saveLastSync(System.currentTimeMillis().toString())
        }
        return SyncResult(applied, lastError)
    }
}
