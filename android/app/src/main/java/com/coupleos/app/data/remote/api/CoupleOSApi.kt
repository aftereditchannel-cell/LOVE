package com.coupleos.app.data.remote.api

import com.coupleos.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface CoupleOSApi {

    // ── Auth / Pairing ──────────────────────────────────────────
    @POST("api/auth/pair")
    suspend fun pairDevice(@Body request: PairRequest): Response<PairResponse>

    @POST("api/auth/validate")
    suspend fun validateToken(@Body request: ValidateTokenRequest): Response<ValidateTokenResponse>

    @POST("api/auth/unpair")
    suspend fun unpairDevice(): Response<Unit>

    // ── Profile ─────────────────────────────────────────────────
    @GET("api/profile")
    suspend fun getProfile(): Response<ProfileResponse>

    @PUT("api/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<ProfileResponse>

    @GET("api/profile/partner")
    suspend fun getPartnerProfile(): Response<ProfileResponse>

    // ── Couple ──────────────────────────────────────────────────
    @GET("api/couple")
    suspend fun getCouple(): Response<CoupleResponse>

    @PUT("api/couple")
    suspend fun updateCouple(@Body request: UpdateCoupleRequest): Response<CoupleResponse>

    // ── Moods ───────────────────────────────────────────────────
    @GET("api/moods")
    suspend fun getMoods(): Response<List<MoodResponse>>

    @POST("api/moods")
    suspend fun createMood(@Body request: CreateMoodRequest): Response<MoodResponse>

    @GET("api/moods/partner/today")
    suspend fun getPartnerTodayMood(): Response<MoodResponse>

    // ── Memories ────────────────────────────────────────────────
    @GET("api/memories")
    suspend fun getMemories(): Response<List<MemoryResponse>>

    @POST("api/memories")
    suspend fun createMemory(@Body request: CreateMemoryRequest): Response<MemoryResponse>

    @PUT("api/memories/{id}")
    suspend fun updateMemory(@Path("id") id: String, @Body request: CreateMemoryRequest): Response<MemoryResponse>

    @DELETE("api/memories/{id}")
    suspend fun deleteMemory(@Path("id") id: String): Response<Unit>

    // ── Journal ─────────────────────────────────────────────────
    @GET("api/journal")
    suspend fun getJournalEntries(): Response<List<JournalResponse>>

    @POST("api/journal")
    suspend fun createJournalEntry(@Body request: CreateJournalRequest): Response<JournalResponse>

    @PUT("api/journal/{id}")
    suspend fun updateJournalEntry(@Path("id") id: String, @Body request: CreateJournalRequest): Response<JournalResponse>

    @DELETE("api/journal/{id}")
    suspend fun deleteJournalEntry(@Path("id") id: String): Response<Unit>

    // ── Chat ────────────────────────────────────────────────────
    @GET("api/chat")
    suspend fun getMessages(@Query("limit") limit: Int = 50, @Query("before") before: String? = null): Response<List<MessageResponse>>

    @POST("api/chat")
    suspend fun sendMessage(@Body request: SendMessageRequest): Response<MessageResponse>

    @PUT("api/chat/{id}")
    suspend fun editMessage(@Path("id") id: String, @Body request: EditMessageRequest): Response<MessageResponse>

    @DELETE("api/chat/{id}")
    suspend fun deleteMessage(@Path("id") id: String): Response<Unit>

    @POST("api/chat/{id}/reaction")
    suspend fun addReaction(@Path("id") id: String, @Body request: ReactionRequest): Response<MessageResponse>

    // ── Calendar ────────────────────────────────────────────────
    @GET("api/calendar")
    suspend fun getCalendarEvents(@Query("from") from: String? = null, @Query("to") to: String? = null): Response<List<CalendarEventResponse>>

    @POST("api/calendar")
    suspend fun createCalendarEvent(@Body request: CreateCalendarEventRequest): Response<CalendarEventResponse>

    @PUT("api/calendar/{id}")
    suspend fun updateCalendarEvent(@Path("id") id: String, @Body request: CreateCalendarEventRequest): Response<CalendarEventResponse>

    @DELETE("api/calendar/{id}")
    suspend fun deleteCalendarEvent(@Path("id") id: String): Response<Unit>

    // ── Tasks ───────────────────────────────────────────────────
    @GET("api/tasks")
    suspend fun getTasks(): Response<List<TaskResponse>>

    @POST("api/tasks")
    suspend fun createTask(@Body request: CreateTaskRequest): Response<TaskResponse>

    @PUT("api/tasks/{id}")
    suspend fun updateTask(@Path("id") id: String, @Body request: CreateTaskRequest): Response<TaskResponse>

    @PATCH("api/tasks/{id}/status")
    suspend fun updateTaskStatus(@Path("id") id: String, @Body request: UpdateTaskStatusRequest): Response<TaskResponse>

    @DELETE("api/tasks/{id}")
    suspend fun deleteTask(@Path("id") id: String): Response<Unit>

    // ── Wishlist ────────────────────────────────────────────────
    @GET("api/wishlist")
    suspend fun getWishlists(): Response<List<WishlistResponse>>

    @POST("api/wishlist")
    suspend fun createWishlist(@Body request: CreateWishlistRequest): Response<WishlistResponse>

    // ── Bucket List ─────────────────────────────────────────────
    @GET("api/bucket-list")
    suspend fun getBucketList(): Response<List<BucketItemResponse>>

    @POST("api/bucket-list")
    suspend fun createBucketItem(@Body request: CreateBucketItemRequest): Response<BucketItemResponse>

    // ── Countdown ───────────────────────────────────────────────
    @GET("api/countdowns")
    suspend fun getCountdowns(): Response<List<CountdownResponse>>

    @POST("api/countdowns")
    suspend fun createCountdown(@Body request: CreateCountdownRequest): Response<CountdownResponse>

    // ── Love Letters ────────────────────────────────────────────
    @GET("api/letters")
    suspend fun getLetters(): Response<List<LoveLetterResponse>>

    @POST("api/letters")
    suspend fun createLetter(@Body request: CreateLetterRequest): Response<LoveLetterResponse>

    // ── Daily Questions ─────────────────────────────────────────
    @GET("api/questions/today")
    suspend fun getTodayQuestion(): Response<DailyQuestionResponse>

    @POST("api/questions/answer")
    suspend fun answerQuestion(@Body request: AnswerQuestionRequest): Response<QuestionAnswerResponse>

    // ── Backup ──────────────────────────────────────────────────
    @POST("api/backup/create")
    suspend fun createBackup(): Response<BackupResponse>

    @GET("api/backup/history")
    suspend fun getBackupHistory(): Response<List<BackupResponse>>

    // ── Devices ─────────────────────────────────────────────────
    @GET("api/devices")
    suspend fun getDevices(): Response<List<DeviceResponse>>

    @DELETE("api/devices/{id}")
    suspend fun revokeDevice(@Path("id") id: String): Response<Unit>

    // ── Sync ────────────────────────────────────────────────────
    @POST("api/sync/push")
    suspend fun syncPush(@Body request: SyncPushRequest): Response<SyncPushResponse>

    @GET("api/sync/pull")
    suspend fun syncPull(@Query("since") since: String): Response<SyncPullResponse>
}
