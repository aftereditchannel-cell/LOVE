package com.coupleos.app.data.remote.dto

import kotlinx.serialization.Serializable

// ── Auth ────────────────────────────────────────────────────────
@Serializable
data class PairRequest(
    val personalToken: String,
    val partnerToken: String,
    val role: String,
    val deviceName: String,
    val deviceId: String,
)

@Serializable
data class PairResponse(
    val sessionToken: String,
    val userId: String,
    val coupleId: String,
    val personAName: String,
    val personBName: String,
    val paired: Boolean,
)

@Serializable
data class ValidateTokenRequest(val token: String, val role: String)

@Serializable
data class ValidateTokenResponse(val valid: Boolean, val name: String = "")

// ── Profile ─────────────────────────────────────────────────────
@Serializable
data class ProfileResponse(
    val id: String = "",
    val role: String = "",
    val name: String = "",
    val nickname: String = "",
    val birthday: String = "",
    val photoUrl: String = "",
    val favoriteColor: String = "",
    val favoriteThings: String = "",
    val loveLanguage: String = "",
)

@Serializable
data class UpdateProfileRequest(
    val name: String = "",
    val nickname: String = "",
    val birthday: String = "",
    val favoriteColor: String = "",
    val favoriteThings: String = "",
    val loveLanguage: String = "",
)

// ── Couple ──────────────────────────────────────────────────────
@Serializable
data class CoupleResponse(
    val id: String = "",
    val name: String = "",
    val startDate: String = "",
    val anniversary: String = "",
    val favoritePlace: String = "",
    val favoriteSong: String = "",
    val ourStory: String = "",
)

@Serializable
data class UpdateCoupleRequest(
    val name: String = "",
    val startDate: String = "",
    val anniversary: String = "",
    val favoritePlace: String = "",
    val favoriteSong: String = "",
    val ourStory: String = "",
)

// ── Mood ────────────────────────────────────────────────────────
@Serializable
data class MoodResponse(
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
)

@Serializable
data class CreateMoodRequest(
    val mood: String,
    val energy: Int = 5,
    val stress: Int = 5,
    val sleep: Int = 5,
    val loveLevel: Int = 5,
    val socialBattery: Int = 5,
    val note: String = "",
    val date: String,
)

// ── Memory ──────────────────────────────────────────────────────
@Serializable
data class MemoryResponse(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val date: String = "",
    val location: String = "",
    val tags: List<String> = emptyList(),
    val mood: String = "",
    val privacy: String = "SHARED",
    val createdBy: String = "",
    val mediaUrls: List<String> = emptyList(),
    val isFavorite: Boolean = false,
)

@Serializable
data class CreateMemoryRequest(
    val title: String,
    val description: String = "",
    val date: String,
    val location: String = "",
    val tags: List<String> = emptyList(),
    val mood: String = "",
    val privacy: String = "SHARED",
)

// ── Journal ─────────────────────────────────────────────────────
@Serializable
data class JournalResponse(
    val id: String = "",
    val title: String = "",
    val content: String = "",
    val mood: String = "",
    val date: String = "",
    val tags: List<String> = emptyList(),
    val privacy: String = "PRIVATE",
    val createdBy: String = "",
)

@Serializable
data class CreateJournalRequest(
    val title: String,
    val content: String,
    val mood: String = "",
    val date: String,
    val tags: List<String> = emptyList(),
    val privacy: String = "PRIVATE",
)

// ── Chat ────────────────────────────────────────────────────────
@Serializable
data class MessageResponse(
    val id: String = "",
    val senderId: String = "",
    val content: String = "",
    val type: String = "TEXT",
    val replyToId: String? = null,
    val reactions: List<String> = emptyList(),
    val isPinned: Boolean = false,
    val isEdited: Boolean = false,
    val seenAt: String? = null,
    val createdAt: String = "",
)

@Serializable
data class SendMessageRequest(
    val content: String,
    val type: String = "TEXT",
    val replyToId: String? = null,
)

@Serializable
data class EditMessageRequest(val content: String)

@Serializable
data class ReactionRequest(val reaction: String)

// ── Calendar ────────────────────────────────────────────────────
@Serializable
data class CalendarEventResponse(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val date: String = "",
    val endDate: String = "",
    val type: String = "CUSTOM",
    val isRecurring: Boolean = false,
    val hasReminder: Boolean = true,
    val reminderMinutes: Int = 30,
    val createdBy: String = "",
)

@Serializable
data class CreateCalendarEventRequest(
    val title: String,
    val description: String = "",
    val date: String,
    val endDate: String = "",
    val type: String = "CUSTOM",
    val isRecurring: Boolean = false,
    val hasReminder: Boolean = true,
    val reminderMinutes: Int = 30,
)

// ── Task ────────────────────────────────────────────────────────
@Serializable
data class TaskResponse(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val dueDate: String = "",
    val priority: String = "MEDIUM",
    val assignedTo: String = "BOTH",
    val status: String = "TODO",
    val createdBy: String = "",
)

@Serializable
data class CreateTaskRequest(
    val title: String,
    val description: String = "",
    val dueDate: String = "",
    val priority: String = "MEDIUM",
    val assignedTo: String = "BOTH",
)

@Serializable
data class UpdateTaskStatusRequest(val status: String)

// ── Wishlist ────────────────────────────────────────────────────
@Serializable
data class WishlistResponse(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val category: String = "",
    val privacy: String = "SHARED",
    val isCompleted: Boolean = false,
    val createdBy: String = "",
)

@Serializable
data class CreateWishlistRequest(
    val title: String,
    val description: String = "",
    val category: String = "",
    val privacy: String = "SHARED",
)

// ── Bucket List ─────────────────────────────────────────────────
@Serializable
data class BucketItemResponse(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val isCompleted: Boolean = false,
    val createdBy: String = "",
)

@Serializable
data class CreateBucketItemRequest(
    val title: String,
    val description: String = "",
)

// ── Countdown ───────────────────────────────────────────────────
@Serializable
data class CountdownResponse(
    val id: String = "",
    val title: String = "",
    val targetDate: String = "",
    val emoji: String = "❤️",
    val createdBy: String = "",
)

@Serializable
data class CreateCountdownRequest(
    val title: String,
    val targetDate: String,
    val emoji: String = "❤️",
)

// ── Love Letter ─────────────────────────────────────────────────
@Serializable
data class LoveLetterResponse(
    val id: String = "",
    val title: String = "",
    val content: String = "",
    val openOnDate: String = "",
    val isOpened: Boolean = false,
    val createdBy: String = "",
    val recipientId: String = "",
)

@Serializable
data class CreateLetterRequest(
    val title: String,
    val content: String,
    val openOnDate: String = "",
)

// ── Daily Question ──────────────────────────────────────────────
@Serializable
data class DailyQuestionResponse(
    val id: String = "",
    val question: String = "",
    val date: String = "",
)

@Serializable
data class AnswerQuestionRequest(
    val questionId: String,
    val answer: String,
)

@Serializable
data class QuestionAnswerResponse(
    val id: String = "",
    val questionId: String = "",
    val userId: String = "",
    val answer: String = "",
)

// ── Backup ──────────────────────────────────────────────────────
@Serializable
data class BackupResponse(
    val id: String = "",
    val versionId: String = "",
    val createdAt: String = "",
    val size: Long = 0,
    val status: String = "",
)

// ── Device ──────────────────────────────────────────────────────
@Serializable
data class DeviceResponse(
    val id: String = "",
    val deviceName: String = "",
    val platform: String = "",
    val lastSeen: String = "",
    val createdAt: String = "",
)

// ── Sync ────────────────────────────────────────────────────────
@Serializable
data class SyncPushRequest(
    val changes: List<SyncChange>,
)

@Serializable
data class SyncChange(
    val table: String,
    val recordId: String,
    val operation: String,
    val data: String, // JSON
    val version: Int,
    val timestamp: String,
)

@Serializable
data class SyncPushResponse(
    val accepted: List<String>,
    val conflicts: List<SyncConflict>,
)

@Serializable
data class SyncConflict(
    val recordId: String,
    val serverVersion: Int,
    val clientVersion: Int,
)

@Serializable
data class SyncPullResponse(
    val changes: List<SyncChange>,
    val lastSyncTimestamp: String,
)
