package com.coupleos.app.data.local.dao

import androidx.room.*
import com.coupleos.app.data.local.entity.*
import kotlinx.coroutines.flow.Flow

@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE id = :id")
    suspend fun getUserById(id: String): UserEntity?

    @Query("SELECT * FROM users WHERE role = :role")
    suspend fun getUserByRole(role: String): UserEntity?

    @Query("SELECT * FROM users")
    fun getAllUsers(): Flow<List<UserEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(user: UserEntity)

    @Update
    suspend fun update(user: UserEntity)

    @Query("SELECT * FROM users")
    suspend fun getAllOnce(): List<UserEntity>

    @Query("UPDATE users SET isSynced = 1")
    suspend fun markAllSynced()

}

@Dao
interface CoupleDao {
    @Query("SELECT * FROM couples LIMIT 1")
    suspend fun getCouple(): CoupleEntity?

    @Query("SELECT * FROM couples LIMIT 1")
    fun observeCouple(): Flow<CoupleEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(couple: CoupleEntity)

    @Update
    suspend fun update(couple: CoupleEntity)

    @Query("SELECT * FROM couples")
    suspend fun getAllOnce(): List<CoupleEntity>

    @Query("UPDATE couples SET isSynced = 1")
    suspend fun markAllSynced()

}

@Dao
interface WishlistDao {
    @Query("SELECT * FROM wishlists WHERE deletedAt IS NULL ORDER BY createdAt DESC")
    fun getAllWishlists(): Flow<List<WishlistEntity>>

    @Query("SELECT * FROM wishlists WHERE privacy = 'SHARED' AND deletedAt IS NULL ORDER BY createdAt DESC")
    fun getSharedWishlists(): Flow<List<WishlistEntity>>

    @Query("SELECT * FROM wishlists WHERE createdBy = :userId AND privacy = 'PRIVATE' AND deletedAt IS NULL ORDER BY createdAt DESC")
    fun getPrivateWishlists(userId: String): Flow<List<WishlistEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(wishlist: WishlistEntity)

    @Update
    suspend fun update(wishlist: WishlistEntity)

    @Query("UPDATE wishlists SET deletedAt = :deletedAt WHERE id = :id")
    suspend fun softDelete(id: String, deletedAt: String)

    @Query("SELECT * FROM wishlists")
    suspend fun getAllOnce(): List<WishlistEntity>

    @Query("UPDATE wishlists SET isSynced = 1")
    suspend fun markAllSynced()

}

@Dao
interface BucketItemDao {
    @Query("SELECT * FROM bucket_items WHERE deletedAt IS NULL ORDER BY createdAt DESC")
    fun getAllItems(): Flow<List<BucketItemEntity>>

    @Query("SELECT COUNT(*) FROM bucket_items WHERE isCompleted = 1 AND deletedAt IS NULL")
    fun getCompletedCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM bucket_items WHERE deletedAt IS NULL")
    fun getTotalCount(): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: BucketItemEntity)

    @Update
    suspend fun update(item: BucketItemEntity)

    @Query("UPDATE bucket_items SET deletedAt = :deletedAt WHERE id = :id")
    suspend fun softDelete(id: String, deletedAt: String)

    @Query("SELECT * FROM bucket_items")
    suspend fun getAllOnce(): List<BucketItemEntity>

    @Query("UPDATE bucket_items SET isSynced = 1")
    suspend fun markAllSynced()

}

@Dao
interface LoveLetterDao {
    @Query("SELECT * FROM love_letters WHERE recipientId = :userId ORDER BY createdAt DESC")
    fun getLettersForUser(userId: String): Flow<List<LoveLetterEntity>>

    @Query("SELECT * FROM love_letters WHERE createdBy = :userId ORDER BY createdAt DESC")
    fun getLettersByUser(userId: String): Flow<List<LoveLetterEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(letter: LoveLetterEntity)

    @Update
    suspend fun update(letter: LoveLetterEntity)

    @Query("SELECT * FROM love_letters ORDER BY createdAt DESC")
    fun getAllLetters(): Flow<List<LoveLetterEntity>>

    @Query("SELECT * FROM love_letters")
    suspend fun getAllOnce(): List<LoveLetterEntity>

    @Query("UPDATE love_letters SET isSynced = 1")
    suspend fun markAllSynced()

}

@Dao
interface SurpriseDao {
    @Query("SELECT * FROM surprises WHERE recipientId = :userId AND isRevealed = 0 ORDER BY createdAt DESC")
    fun getUnrevealedSurprises(userId: String): Flow<List<SurpriseEntity>>

    @Query("SELECT * FROM surprises WHERE createdBy = :userId ORDER BY createdAt DESC")
    fun getSurprisesByUser(userId: String): Flow<List<SurpriseEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(surprise: SurpriseEntity)

    @Update
    suspend fun update(surprise: SurpriseEntity)

    @Query("SELECT * FROM surprises ORDER BY createdAt DESC")
    fun getAllSurprises(): Flow<List<SurpriseEntity>>

    @Query("SELECT * FROM surprises")
    suspend fun getAllOnce(): List<SurpriseEntity>

    @Query("UPDATE surprises SET isSynced = 1")
    suspend fun markAllSynced()

}

@Dao
interface CountdownDao {
    @Query("SELECT * FROM countdowns ORDER BY targetDate ASC")
    fun getAllCountdowns(): Flow<List<CountdownEntity>>

    @Query("SELECT * FROM countdowns WHERE targetDate >= :today ORDER BY targetDate ASC")
    fun getUpcomingCountdowns(today: String): Flow<List<CountdownEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(countdown: CountdownEntity)

    @Update
    suspend fun update(countdown: CountdownEntity)

    @Query("DELETE FROM countdowns WHERE id = :id")
    suspend fun delete(id: String)

    @Query("SELECT * FROM countdowns")
    suspend fun getAllOnce(): List<CountdownEntity>

    @Query("UPDATE countdowns SET isSynced = 1")
    suspend fun markAllSynced()

}

@Dao
interface ExpenseDao {
    @Query("SELECT * FROM expenses ORDER BY date DESC")
    fun getAllExpenses(): Flow<List<ExpenseEntity>>

    @Query("SELECT SUM(amount) FROM expenses WHERE paidBy = :userId")
    fun getTotalPaidBy(userId: String): Flow<Double?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(expense: ExpenseEntity)

    @Update
    suspend fun update(expense: ExpenseEntity)

    @Query("DELETE FROM expenses WHERE id = :id")
    suspend fun delete(id: String)

    @Query("SELECT * FROM expenses")
    suspend fun getAllOnce(): List<ExpenseEntity>

    @Query("UPDATE expenses SET isSynced = 1")
    suspend fun markAllSynced()

}

@Dao
interface TimelineDao {
    @Query("SELECT * FROM timeline_events ORDER BY date ASC")
    fun getAllEvents(): Flow<List<TimelineEventEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(event: TimelineEventEntity)

    @Update
    suspend fun update(event: TimelineEventEntity)

    @Query("DELETE FROM timeline_events WHERE id = :id")
    suspend fun delete(id: String)

    @Query("SELECT * FROM timeline_events")
    suspend fun getAllOnce(): List<TimelineEventEntity>

    @Query("UPDATE timeline_events SET isSynced = 1")
    suspend fun markAllSynced()

}

@Dao
interface DailyQuestionDao {
    @Query("SELECT * FROM daily_questions WHERE date = :date LIMIT 1")
    suspend fun getQuestionByDate(date: String): DailyQuestionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(question: DailyQuestionEntity)

    @Query("SELECT * FROM question_answers WHERE questionId = :questionId")
    fun getAnswers(questionId: String): Flow<List<QuestionAnswerEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAnswer(answer: QuestionAnswerEntity)

    @Query("SELECT * FROM daily_questions ORDER BY date DESC")
    fun observeAllQuestions(): Flow<List<DailyQuestionEntity>>

    @Query("SELECT * FROM question_answers ORDER BY createdAt DESC")
    fun observeAllAnswers(): Flow<List<QuestionAnswerEntity>>

    @Query("SELECT * FROM daily_questions")
    suspend fun getAllQuestionsOnce(): List<DailyQuestionEntity>

    @Query("SELECT * FROM question_answers")
    suspend fun getAllAnswersOnce(): List<QuestionAnswerEntity>

    @Query("UPDATE question_answers SET isSynced = 1")
    suspend fun markAllAnswersSynced()

}

@Dao
interface SyncQueueDao {
    @Query("SELECT * FROM sync_queue WHERE status = 'PENDING' ORDER BY createdAt ASC")
    suspend fun getPendingItems(): List<SyncQueueEntity>

    @Insert
    suspend fun insert(item: SyncQueueEntity)

    @Update
    suspend fun update(item: SyncQueueEntity)

    @Query("DELETE FROM sync_queue WHERE id = :id")
    suspend fun delete(id: Long)

    @Query("UPDATE sync_queue SET status = 'COMPLETED' WHERE id = :id")
    suspend fun markCompleted(id: Long)

    @Query("UPDATE sync_queue SET status = 'FAILED', attempts = attempts + 1, lastAttempt = :timestamp WHERE id = :id")
    suspend fun markFailed(id: Long, timestamp: String)
}

@Dao
interface RelationshipCheckinDao {
    @Query("SELECT * FROM relationship_checkins ORDER BY date DESC")
    fun getAllCheckins(): Flow<List<RelationshipCheckinEntity>>

    @Query("SELECT * FROM relationship_checkins WHERE userId = :userId AND date = :date LIMIT 1")
    suspend fun getCheckin(userId: String, date: String): RelationshipCheckinEntity?

    @Query("SELECT * FROM relationship_checkins")
    suspend fun getAllOnce(): List<RelationshipCheckinEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(checkin: RelationshipCheckinEntity)

    @Query("DELETE FROM relationship_checkins WHERE id = :id")
    suspend fun delete(id: String)
    @Query("UPDATE relationship_checkins SET isSynced = 1")
    suspend fun markAllSynced()

}
