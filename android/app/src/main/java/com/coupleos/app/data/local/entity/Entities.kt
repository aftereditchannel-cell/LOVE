package com.coupleos.app.data.local.entity

import androidx.room.*

@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey val id: String,
    val role: String,
    val name: String,
    val nickname: String = "",
    val birthday: String = "",
    val photoUrl: String = "",
    val favoriteColor: String = "",
    val favoriteThings: String = "",
    val loveLanguage: String = "",
    val createdAt: String,
    val updatedAt: String,
    val version: Int = 1,
    val isSynced: Boolean = false,
)

@Entity(tableName = "couples")
data class CoupleEntity(
    @PrimaryKey val id: String,
    val name: String = "",
    val startDate: String = "",
    val couplePhoto: String = "",
    val anniversary: String = "",
    val favoritePlace: String = "",
    val favoriteSong: String = "",
    val ourStory: String = "",
    val personAId: String,
    val personBId: String,
    val createdAt: String,
    val updatedAt: String,
    val version: Int = 1,
    val isSynced: Boolean = false,
)

@Entity(tableName = "moods")
data class MoodEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val mood: String,
    val energy: Int = 5,
    val stress: Int = 5,
    val sleep: Int = 5,
    val loveLevel: Int = 5,
    val socialBattery: Int = 5,
    val note: String = "",
    val date: String,
    val createdAt: String,
    val version: Int = 1,
    val isSynced: Boolean = false,
)

@Entity(tableName = "memories")
data class MemoryEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String = "",
    val date: String,
    val location: String = "",
    val tags: String = "", // JSON array
    val mood: String = "",
    val privacy: String = "SHARED",
    val createdBy: String,
    val mediaUrls: String = "", // JSON array
    val isFavorite: Boolean = false,
    val createdAt: String,
    val updatedAt: String,
    val deletedAt: String? = null,
    val version: Int = 1,
    val isSynced: Boolean = false,
)

@Entity(tableName = "journal_entries")
data class JournalEntity(
    @PrimaryKey val id: String,
    val title: String,
    val content: String,
    val mood: String = "",
    val date: String,
    val tags: String = "",
    val photos: String = "",
    val privacy: String = "PRIVATE",
    val createdBy: String,
    val createdAt: String,
    val updatedAt: String,
    val deletedAt: String? = null,
    val version: Int = 1,
    val isSynced: Boolean = false,
)

@Entity(tableName = "messages")
data class MessageEntity(
    @PrimaryKey val id: String,
    val coupleId: String,
    val senderId: String,
    val content: String,
    val type: String = "TEXT",
    val replyToId: String? = null,
    val reactions: String = "",
    val isPinned: Boolean = false,
    val isEdited: Boolean = false,
    val isDeleted: Boolean = false,
    val seenAt: String? = null,
    val createdAt: String,
    val updatedAt: String,
    val version: Int = 1,
    val isSynced: Boolean = false,
)

@Entity(tableName = "calendar_events")
data class CalendarEventEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String = "",
    val date: String,
    val endDate: String = "",
    val type: String = "CUSTOM",
    val isRecurring: Boolean = false,
    val hasReminder: Boolean = true,
    val reminderMinutes: Int = 30,
    val createdBy: String,
    val createdAt: String,
    val updatedAt: String,
    val deletedAt: String? = null,
    val version: Int = 1,
    val isSynced: Boolean = false,
)

@Entity(tableName = "tasks")
data class TaskEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String = "",
    val dueDate: String = "",
    val priority: String = "MEDIUM",
    val assignedTo: String = "BOTH",
    val status: String = "TODO",
    val createdBy: String,
    val createdAt: String,
    val updatedAt: String,
    val deletedAt: String? = null,
    val version: Int = 1,
    val isSynced: Boolean = false,
)

@Entity(tableName = "wishlists")
data class WishlistEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String = "",
    val category: String = "",
    val privacy: String = "SHARED",
    val isCompleted: Boolean = false,
    val createdBy: String,
    val createdAt: String,
    val updatedAt: String,
    val deletedAt: String? = null,
    val version: Int = 1,
    val isSynced: Boolean = false,
)

@Entity(tableName = "bucket_items")
data class BucketItemEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String = "",
    val isCompleted: Boolean = false,
    val completedDate: String = "",
    val photoUrl: String = "",
    val createdBy: String,
    val createdAt: String,
    val updatedAt: String,
    val deletedAt: String? = null,
    val version: Int = 1,
    val isSynced: Boolean = false,
)

@Entity(tableName = "love_letters")
data class LoveLetterEntity(
    @PrimaryKey val id: String,
    val title: String,
    val content: String,
    val openOnDate: String = "",
    val isOpened: Boolean = false,
    val createdBy: String,
    val recipientId: String,
    val createdAt: String,
    val version: Int = 1,
    val isSynced: Boolean = false,
)

@Entity(tableName = "surprises")
data class SurpriseEntity(
    @PrimaryKey val id: String,
    val title: String,
    val content: String,
    val triggerType: String = "",
    val triggerValue: String = "",
    val isRevealed: Boolean = false,
    val createdBy: String,
    val recipientId: String,
    val createdAt: String,
    val version: Int = 1,
    val isSynced: Boolean = false,
)

@Entity(tableName = "daily_questions")
data class DailyQuestionEntity(
    @PrimaryKey val id: String,
    val question: String,
    val date: String,
)

@Entity(tableName = "question_answers")
data class QuestionAnswerEntity(
    @PrimaryKey val id: String,
    val questionId: String,
    val userId: String,
    val answer: String,
    val createdAt: String,
    val isSynced: Boolean = false,
)

@Entity(tableName = "countdowns")
data class CountdownEntity(
    @PrimaryKey val id: String,
    val title: String,
    val targetDate: String,
    val emoji: String = "❤️",
    val createdBy: String,
    val createdAt: String,
    val version: Int = 1,
    val isSynced: Boolean = false,
)

@Entity(tableName = "expenses")
data class ExpenseEntity(
    @PrimaryKey val id: String,
    val amount: Double = 0.0,
    val currency: String = "IRR",
    val category: String = "",
    val paidBy: String,
    val splitType: String = "equal",
    val date: String,
    val note: String = "",
    val createdBy: String,
    val createdAt: String,
    val version: Int = 1,
    val isSynced: Boolean = false,
)

@Entity(tableName = "timeline_events")
data class TimelineEventEntity(
    @PrimaryKey val id: String,
    val title: String,
    val date: String,
    val description: String = "",
    val type: String = "",
    val photoUrl: String = "",
    val createdAt: String,
    val version: Int = 1,
    val isSynced: Boolean = false,
)

@Entity(tableName = "relationship_checkins")
data class RelationshipCheckinEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val communication: Int = 5,
    val trust: Int = 5,
    val qualityTime: Int = 5,
    val affection: Int = 5,
    val funScore: Int = 5,
    val support: Int = 5,
    val date: String,
    val createdAt: String,
    val version: Int = 1,
    val isSynced: Boolean = false,
)

@Entity(tableName = "sync_queue")
data class SyncQueueEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val tableName: String,
    val recordId: String,
    val operation: String, // "INSERT", "UPDATE", "DELETE"
    val payload: String, // JSON
    val createdAt: String,
    val attempts: Int = 0,
    val lastAttempt: String? = null,
    val status: String = "PENDING", // PENDING, IN_PROGRESS, FAILED, COMPLETED
)
