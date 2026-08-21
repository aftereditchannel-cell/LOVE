package com.coupleos.app.data.local.database

import androidx.room.Database
import androidx.room.RoomDatabase
import com.coupleos.app.data.local.dao.*
import com.coupleos.app.data.local.entity.*

@Database(
    entities = [
        UserEntity::class,
        CoupleEntity::class,
        MoodEntity::class,
        MemoryEntity::class,
        JournalEntity::class,
        MessageEntity::class,
        CalendarEventEntity::class,
        TaskEntity::class,
        WishlistEntity::class,
        BucketItemEntity::class,
        LoveLetterEntity::class,
        SurpriseEntity::class,
        DailyQuestionEntity::class,
        QuestionAnswerEntity::class,
        CountdownEntity::class,
        ExpenseEntity::class,
        TimelineEventEntity::class,
        RelationshipCheckinEntity::class,
        SyncQueueEntity::class,
    ],
    version = 2,
    exportSchema = true,
)
abstract class CoupleOSDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
    abstract fun coupleDao(): CoupleDao
    abstract fun moodDao(): MoodDao
    abstract fun memoryDao(): MemoryDao
    abstract fun journalDao(): JournalDao
    abstract fun messageDao(): MessageDao
    abstract fun calendarDao(): CalendarDao
    abstract fun taskDao(): TaskDao
    abstract fun wishlistDao(): WishlistDao
    abstract fun bucketItemDao(): BucketItemDao
    abstract fun loveLetterDao(): LoveLetterDao
    abstract fun surpriseDao(): SurpriseDao
    abstract fun countdownDao(): CountdownDao
    abstract fun expenseDao(): ExpenseDao
    abstract fun timelineDao(): TimelineDao
    abstract fun dailyQuestionDao(): DailyQuestionDao
    abstract fun relationshipCheckinDao(): RelationshipCheckinDao
    abstract fun syncQueueDao(): SyncQueueDao
}
