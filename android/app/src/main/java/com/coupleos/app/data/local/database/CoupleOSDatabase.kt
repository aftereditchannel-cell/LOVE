package com.coupleos.app.data.local.database

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
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
    version = 1,
    exportSchema = false,
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
    abstract fun syncQueueDao(): SyncQueueDao

    companion object {
        /**
         * Schema migrations.
         *
         * Every future schema change MUST add a Migration here and bump `version`,
         * so installing a new APK over an old one upgrades the database in place
         * and the user keeps all of their existing data.
         *
         * Destructive fallback is deliberately NOT enabled.
         */
        val MIGRATIONS: Array<Migration> = arrayOf(
            // Example for the next schema change:
            // object : Migration(1, 2) {
            //     override fun migrate(db: SupportSQLiteDatabase) {
            //         db.execSQL("ALTER TABLE moods ADD COLUMN newField TEXT NOT NULL DEFAULT ''")
            //     }
            // },
        )
    }
}
