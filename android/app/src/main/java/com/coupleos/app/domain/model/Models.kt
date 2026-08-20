package com.coupleos.app.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class UserProfile(
    val id: String = "",
    val role: String = "",
    val name: String = "",
    val nickname: String = "",
    val birthday: String = "",
    val photoUrl: String = "",
    val favoriteColor: String = "",
    val favoriteThings: String = "",
    val loveLanguage: String = "",
    val createdAt: String = "",
    val updatedAt: String = "",
)

@Serializable
data class CoupleProfile(
    val id: String = "",
    val name: String = "",
    val startDate: String = "",
    val couplePhoto: String = "",
    val anniversary: String = "",
    val favoritePlace: String = "",
    val favoriteSong: String = "",
    val ourStory: String = "",
    val personAId: String = "",
    val personBId: String = "",
    val createdAt: String = "",
    val updatedAt: String = "",
)

@Serializable
data class MoodEntry(
    val id: String = "",
    val userId: String = "",
    val mood: String = "",
    val energy: Int = 5,
    val stress: Int = 5,
    val sleep: Int = 5,
    val loveLevel: Int = 5,
    val socialBattery: Int = 5,
    val note: String = "",
    val date: String = "",
    val createdAt: String = "",
)

@Serializable
data class Memory(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val date: String = "",
    val location: String = "",
    val tags: List<String> = emptyList(),
    val mood: String = "",
    val privacy: ContentPrivacy = ContentPrivacy.SHARED,
    val createdBy: String = "",
    val mediaUrls: List<String> = emptyList(),
    val isFavorite: Boolean = false,
    val createdAt: String = "",
    val updatedAt: String = "",
)

@Serializable
data class JournalEntry(
    val id: String = "",
    val title: String = "",
    val content: String = "",
    val mood: String = "",
    val date: String = "",
    val tags: List<String> = emptyList(),
    val photos: List<String> = emptyList(),
    val privacy: ContentPrivacy = ContentPrivacy.PRIVATE,
    val createdBy: String = "",
    val createdAt: String = "",
    val updatedAt: String = "",
)

@Serializable
data class ChatMessage(
    val id: String = "",
    val coupleId: String = "",
    val senderId: String = "",
    val content: String = "",
    val type: MessageType = MessageType.TEXT,
    val replyToId: String? = null,
    val reactions: List<String> = emptyList(),
    val isPinned: Boolean = false,
    val isEdited: Boolean = false,
    val isDeleted: Boolean = false,
    val seenAt: String? = null,
    val createdAt: String = "",
    val updatedAt: String = "",
)

@Serializable
enum class MessageType {
    TEXT, IMAGE, VIDEO, FILE, VOICE
}

@Serializable
enum class ContentPrivacy {
    PRIVATE, SHARED
}

@Serializable
data class CalendarEvent(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val date: String = "",
    val endDate: String = "",
    val type: EventType = EventType.CUSTOM,
    val isRecurring: Boolean = false,
    val hasReminder: Boolean = true,
    val reminderMinutes: Int = 30,
    val createdBy: String = "",
    val createdAt: String = "",
    val updatedAt: String = "",
)

@Serializable
enum class EventType {
    BIRTHDAY, ANNIVERSARY, TRIP, MOVIE, DINNER, APPOINTMENT, TASK, CUSTOM
}

@Serializable
data class Task(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val dueDate: String = "",
    val priority: TaskPriority = TaskPriority.MEDIUM,
    val assignedTo: TaskAssignment = TaskAssignment.BOTH,
    val status: TaskStatus = TaskStatus.TODO,
    val createdBy: String = "",
    val createdAt: String = "",
    val updatedAt: String = "",
)

@Serializable
enum class TaskPriority { LOW, MEDIUM, HIGH }

@Serializable
enum class TaskAssignment { ME, PARTNER, BOTH }

@Serializable
enum class TaskStatus { TODO, DOING, DONE }

@Serializable
data class WishlistItem(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val category: String = "",
    val privacy: ContentPrivacy = ContentPrivacy.SHARED,
    val isCompleted: Boolean = false,
    val createdBy: String = "",
    val createdAt: String = "",
    val updatedAt: String = "",
)

@Serializable
data class BucketItem(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val isCompleted: Boolean = false,
    val completedDate: String = "",
    val photoUrl: String = "",
    val createdBy: String = "",
    val createdAt: String = "",
    val updatedAt: String = "",
)

@Serializable
data class LoveLetter(
    val id: String = "",
    val title: String = "",
    val content: String = "",
    val openOnDate: String = "",
    val isOpened: Boolean = false,
    val createdBy: String = "",
    val recipientId: String = "",
    val createdAt: String = "",
)

@Serializable
data class Surprise(
    val id: String = "",
    val title: String = "",
    val content: String = "",
    val triggerType: String = "", // "date", "mood", "custom"
    val triggerValue: String = "",
    val isRevealed: Boolean = false,
    val createdBy: String = "",
    val recipientId: String = "",
    val createdAt: String = "",
)

@Serializable
data class DailyQuestion(
    val id: String = "",
    val question: String = "",
    val date: String = "",
)

@Serializable
data class QuestionAnswer(
    val id: String = "",
    val questionId: String = "",
    val userId: String = "",
    val answer: String = "",
    val createdAt: String = "",
)

@Serializable
data class Countdown(
    val id: String = "",
    val title: String = "",
    val targetDate: String = "",
    val emoji: String = "❤️",
    val createdBy: String = "",
    val createdAt: String = "",
)

@Serializable
data class Expense(
    val id: String = "",
    val amount: Double = 0.0,
    val currency: String = "IRR",
    val category: String = "",
    val paidBy: String = "",
    val splitType: String = "equal",
    val date: String = "",
    val note: String = "",
    val createdBy: String = "",
    val createdAt: String = "",
)

@Serializable
data class TimelineEvent(
    val id: String = "",
    val title: String = "",
    val date: String = "",
    val description: String = "",
    val type: String = "",
    val photoUrl: String = "",
    val createdAt: String = "",
)

@Serializable
data class RelationshipCheckin(
    val id: String = "",
    val userId: String = "",
    val communication: Int = 5,
    val trust: Int = 5,
    val qualityTime: Int = 5,
    val affection: Int = 5,
    val fun_: Int = 5,
    val support: Int = 5,
    val date: String = "",
    val createdAt: String = "",
)

@Serializable
data class DeviceInfo(
    val id: String = "",
    val userId: String = "",
    val deviceName: String = "",
    val platform: String = "android",
    val lastSeen: String = "",
    val createdAt: String = "",
    val revokedAt: String? = null,
)

@Serializable
data class PairingState(
    val isPaired: Boolean = false,
    val role: PersonRole? = null,
    val personAName: String = "",
    val personBName: String = "",
    val deviceId: String = "",
)
