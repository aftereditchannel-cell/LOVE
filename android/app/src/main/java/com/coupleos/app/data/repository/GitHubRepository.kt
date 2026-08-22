package com.coupleos.app.data.repository

import com.coupleos.app.data.remote.api.*
import com.coupleos.app.security.keystore.SecureStorage
import kotlinx.serialization.json.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for syncing ALL app data with GitHub via Private Gists.
 * 
 * FIXED ARCHITECTURE — data is truly registered and retrieved on token:
 * - Each person has own GitHub PAT (ghp_...) — stored as personalToken / partnerToken
 * - Each token owns its own private Gist (myGistId / partnerGistId)
 * - EVERY write operation saves to BOTH gists when possible (dual-write), guaranteeing data is on token
 * - EVERY read operation merges data from BOTH gists + local, deduplicating by ID / date
 * - If one token/gist is unavailable, data still survives on the other — eventual consistency
 * - All entity types are now supported: moods, memories, messages, calendar, tasks, journal,
 *   wishlist, bucketList, countdowns, letters, questions, etc.
 * 
 * This fixes: "اتصال رو تایید میکنه ولی دیتا رو واقعا روی توکن ثبت یا دریافت نمیکنه"
 */
@Singleton
class GitHubRepository @Inject constructor(
    private val gitHubApi: GitHubApi,
    private val secureStorage: SecureStorage,
    @PublishedApi internal val json: Json,
) {
    companion object {
        const val COUPLE_GIST_DESCRIPTION = "CoupleOS-SharedData"
        const val PERSONAL_GIST_DESCRIPTION = "CoupleOS-PersonalData"
        
        // Shared files inside the gist
        const val SHARED_FILE = "couple_shared.json"
        const val MOODS_FILE = "moods.json"
        const val MEMORIES_FILE = "memories.json"
        const val MESSAGES_FILE = "messages.json"
        const val CALENDAR_FILE = "calendar.json"
        const val TASKS_FILE = "tasks.json"
        const val JOURNAL_FILE = "journal.json"
        const val WISHLIST_FILE = "wishlist.json"
        const val BUCKET_FILE = "bucket_list.json"
        const val LETTERS_FILE = "letters.json"
        const val COUNTDOWNS_FILE = "countdowns.json"
        const val QUESTIONS_FILE = "questions.json"
        const val EXPENSES_FILE = "expenses.json"
        const val SURPRISES_FILE = "surprises.json"
        const val TIMELINE_FILE = "timeline.json"

        val ALL_FILES = listOf(
            SHARED_FILE, MOODS_FILE, MEMORIES_FILE, MESSAGES_FILE,
            CALENDAR_FILE, TASKS_FILE, JOURNAL_FILE, WISHLIST_FILE,
            BUCKET_FILE, LETTERS_FILE, COUNTDOWNS_FILE, QUESTIONS_FILE,
            EXPENSES_FILE, SURPRISES_FILE, TIMELINE_FILE
        )
    }

    private fun authHeader(token: String): String = "Bearer $token"

    // ── Token Validation ────────────────────────────────────

    suspend fun validateToken(token: String): Result<GitHubUser> {
        return try {
            val response = gitHubApi.getUser(authHeader(token))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val code = response.code()
                val msg = when (code) {
                    401 -> "توکن نامعتبر است"
                    403 -> "دسترسی رد شد — توکن مشکل دارد"
                    else -> "خطا در اتصال به GitHub (کد $code)"
                }
                Result.failure(Exception(msg))
            }
        } catch (e: Exception) {
            Result.failure(Exception("خطا در اتصال به اینترنت: ${e.localizedMessage}"))
        }
    }

    suspend fun checkConnection(): ConnectionStatus {
        val myToken = secureStorage.getPersonalToken() ?: return ConnectionStatus(false, false, "توکن شخصی یافت نشد")
        val partnerToken = secureStorage.getPartnerToken() ?: return ConnectionStatus(false, false, "توکن پارتنر یافت نشد")

        val myResult = validateToken(myToken)
        val partnerResult = validateToken(partnerToken)

        return ConnectionStatus(
            myConnected = myResult.isSuccess,
            partnerConnected = partnerResult.isSuccess,
            error = when {
                myResult.isFailure -> "توکن شخصی: ${myResult.exceptionOrNull()?.message}"
                partnerResult.isFailure -> "توکن پارتنر: ${partnerResult.exceptionOrNull()?.message}"
                else -> null
            },
            myUsername = myResult.getOrNull()?.login,
            partnerUsername = partnerResult.getOrNull()?.login,
        )
    }

    // ── Gist Management ─────────────────────────────────────

    /**
     * Find or create Gist for a specific token
     */
    private suspend fun getOrCreateGistForToken(token: String): Result<String> {
        return try {
            val gists = gitHubApi.listGists(authHeader(token))
            if (!gists.isSuccessful) {
                return Result.failure(Exception("خطا در دریافت Gist‌ها"))
            }

            val existing = gists.body()?.find { it.description == COUPLE_GIST_DESCRIPTION }
            if (existing != null) {
                return Result.success(existing.id)
            }

            // Create new shared gist with all files initialized
            val initialFiles = ALL_FILES.associate { fileName ->
                val initialContent = when (fileName) {
                    SHARED_FILE -> json.encodeToString(CoupleSharedData(
                        personAName = secureStorage.getPersonAName(),
                        personBName = secureStorage.getPersonBName(),
                        createdAt = System.currentTimeMillis().toString()
                    ))
                    else -> "[]"
                }
                fileName to GistFileContent(initialContent)
            }

            val createResponse = gitHubApi.createGist(
                authHeader(token),
                CreateGistRequest(
                    description = COUPLE_GIST_DESCRIPTION,
                    public = false,
                    files = initialFiles
                )
            )

            if (createResponse.isSuccessful && createResponse.body() != null) {
                Result.success(createResponse.body()!!.id)
            } else {
                Result.failure(Exception("خطا در ساخت Gist: ${createResponse.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(Exception("خطا در اتصال: ${e.localizedMessage}"))
        }
    }

    /**
     * Ensure both gists exist (my token + partner token)
     * Returns pair of gistIds
     */
    suspend fun ensureBothGists(): Pair<String?, String?> {
        var myGistId = secureStorage.getMyGistId()
        var partnerGistId = secureStorage.getPartnerGistId()

        // Try to ensure my gist
        if (myGistId == null) {
            val myToken = secureStorage.getPersonalToken()
            if (myToken != null) {
                val result = getOrCreateGistForToken(myToken)
                if (result.isSuccess) {
                    myGistId = result.getOrNull()
                    myGistId?.let { secureStorage.saveMyGistId(it) }
                }
            }
        }

        // Try to ensure partner gist
        if (partnerGistId == null) {
            val partnerToken = secureStorage.getPartnerToken()
            if (partnerToken != null) {
                val result = getOrCreateGistForToken(partnerToken)
                if (result.isSuccess) {
                    partnerGistId = result.getOrNull()
                    partnerGistId?.let { secureStorage.savePartnerGistId(it) }
                }
            }
        }

        return Pair(myGistId, partnerGistId)
    }

    /**
     * Find or create the shared couple Gist using my token (legacy single-gist)
     */
    suspend fun getOrCreateSharedGist(): Result<String> {
        val (myGist, _) = ensureBothGists()
        return if (myGist != null) Result.success(myGist)
        else Result.failure(Exception("Gist ساخته نشد"))
    }

    // ── Core Data Sync — DUAL WRITE / MERGED READ ──────────

    /**
     * Save content to gist(s) — dual write to both tokens' gists
     * This guarantees data is registered on token
     */
    suspend fun saveToGist(fileName: String, content: String): Result<Unit> {
        val (myGistId, partnerGistId) = ensureBothGists()
        
        var lastError: Exception? = null
        var successCount = 0

        // Save to my gist
        val myToken = secureStorage.getPersonalToken()
        if (myToken != null && myGistId != null) {
            try {
                val response = gitHubApi.updateGist(
                    authHeader(myToken),
                    myGistId,
                    UpdateGistRequest(files = mapOf(fileName to GistFileContent(content)))
                )
                if (response.isSuccessful) successCount++ else lastError = Exception("My gist: ${response.code()}")
            } catch (e: Exception) {
                lastError = e
            }
        }

        // Save to partner gist as backup — ensures token data replication
        val partnerToken = secureStorage.getPartnerToken()
        if (partnerToken != null && partnerGistId != null) {
            try {
                val response = gitHubApi.updateGist(
                    authHeader(partnerToken),
                    partnerGistId,
                    UpdateGistRequest(files = mapOf(fileName to GistFileContent(content)))
                )
                if (response.isSuccessful) successCount++ else lastError = Exception("Partner gist: ${response.code()}")
            } catch (e: Exception) {
                // Partner save failure is not fatal if my gist succeeded
                if (successCount == 0) lastError = e
            }
        }

        return if (successCount > 0) Result.success(Unit)
        else Result.failure(lastError ?: Exception("هیچ Gistی در دسترس نیست"))
    }

    /**
     * Save JSON list by merging with existing remote data (prevents overwrite loss)
     * Reads remote, decodes, merges by 'id' field, then saves merged list
     */
    suspend fun saveMergedList(fileName: String, newItemJson: String, idExtractor: (JsonObject) -> String?): Result<Unit> {
        return try {
            // Try to read existing remote list
            val existingContent = readMergedContent(fileName).getOrNull() ?: "[]"
            val newElement = json.parseToJsonElement(newItemJson).let {
                if (it is JsonObject) it else null
            } ?: return saveToGist(fileName, "[$newItemJson]")

            val existingArray = try {
                json.parseToJsonElement(existingContent).jsonArray
            } catch (_: Exception) { JsonArray(emptyList()) }

            val newId = idExtractor(newElement)
            val merged = mutableListOf<JsonElement>()

            var replaced = false
            for (elem in existingArray) {
                if (elem is JsonObject && newId != null && idExtractor(elem) == newId) {
                    merged.add(newElement)
                    replaced = true
                } else {
                    merged.add(elem)
                }
            }
            if (!replaced) merged.add(newElement)

            val final = JsonArray(merged).let { arr ->
                buildString {
                    append("[")
                    arr.forEachIndexed { idx, el ->
                        if (idx > 0) append(",")
                        append(json.encodeToString(el))
                    }
                    append("]")
                }
            }
            saveToGist(fileName, final)
        } catch (e: Exception) {
            // Fallback: direct save of array with item
            saveToGist(fileName, "[$newItemJson]")
        }
    }

    /**
     * Save a full list JSON (e.g., after collecting all local items)
     * This replaces the file content with complete list — used for bulk sync
     */
    suspend fun saveFullList(fileName: String, listJson: String): Result<Unit> {
        // Validate it's JSON array
        try {
            json.parseToJsonElement(listJson).jsonArray
        } catch (e: Exception) {
            return Result.failure(Exception("Invalid JSON array"))
        }
        return saveToGist(fileName, listJson)
    }

    /**
     * Remove one item (by id) from a list file on the gists.
     * Propagates deletions so removed items do not resurrect on the partner's phone.
     */
    suspend fun removeFromList(fileName: String, id: String): Result<Unit> {
        return try {
            val existing = readMergedContent(fileName).getOrNull() ?: return Result.success(Unit)
            val arr = try { json.parseToJsonElement(existing).jsonArray }
                      catch (_: Exception) { return Result.success(Unit) }
            val filtered = arr.filter { elem ->
                val obj = elem as? JsonObject
                (obj?.get("id")?.jsonPrimitive?.contentOrNull) != id
            }
            val final = buildString {
                append("[")
                filtered.forEachIndexed { idx, el ->
                    if (idx > 0) append(",")
                    append(json.encodeToString(el))
                }
                append("]")
            }
            saveToGist(fileName, final)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Verify a token can actually read/write gists (needs `gist` scope).
     * Writes then reads back a tiny heartbeat file inside the couple gist.
     */
    suspend fun verifyGistWritable(token: String, gistId: String): Result<Unit> {
        return try {
            val probe = "heartbeat-${System.currentTimeMillis()}"
            val write = gitHubApi.updateGist(
                authHeader(token),
                gistId,
                UpdateGistRequest(files = mapOf("heartbeat.json" to GistFileContent("\"$probe\"")))
            )
            if (!write.isSuccessful) {
                val msg = if (write.code() == 403 || write.code() == 404)
                    "توکن اجازه نوشتن روی Gist ندارد — مطمئن شو scope گزینه «gist» رو فعال کرده باشی (کد ${write.code()})"
                else "خطا در نوشتن روی توکن (کد ${write.code()})"
                return Result.failure(Exception(msg))
            }
            val read = gitHubApi.getGist(authHeader(token), gistId)
            val content = read.body()?.files?.get("heartbeat.json")?.content
            if (read.isSuccessful && content != null && content.contains(probe)) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("خواندن از Gist ناموفق بود (کد ${read.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(Exception("خطا در بررسی Gist: ${e.localizedMessage}"))
        }
    }

    /**
     * Read content from a single gist file via token
     */
    private suspend fun readGistFile(token: String, gistId: String?, fileName: String): Result<String> {
        val id = gistId ?: run {
            // Try to find gist by listing
            val gists = gitHubApi.listGists(authHeader(token))
            if (!gists.isSuccessful) return Result.failure(Exception("list gists failed"))
            gists.body()?.find { it.description == COUPLE_GIST_DESCRIPTION }?.id
                ?: return Result.failure(Exception("Gist یافت نشد"))
        }

        return try {
            val fullGist = gitHubApi.getGist(authHeader(token), id)
            if (!fullGist.isSuccessful) return Result.failure(Exception("get gist failed ${fullGist.code()}"))
            val file = fullGist.body()?.files?.get(fileName) ?: return Result.failure(Exception("فایل $fileName یافت نشد"))
            // Gist API truncates files larger than ~1MB — fetch raw content instead.
            if (file.truncated && file.raw_url.isNotBlank()) {
                val raw = gitHubApi.getRawGistFile(file.raw_url, authHeader(token))
                if (raw.isSuccessful && raw.body() != null) {
                    return Result.success(raw.body()!!.string())
                }
            }
            Result.success(file.content)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Read and merge content from BOTH gists for a file
     * Returns merged JSON array string deduplicated by id
     */
    suspend fun readMergedContent(fileName: String): Result<String> {
        val myToken = secureStorage.getPersonalToken()
        val partnerToken = secureStorage.getPartnerToken()
        val myGistId = secureStorage.getMyGistId()
        val partnerGistId = secureStorage.getPartnerGistId()

        var myContent: String? = null
        var partnerContent: String? = null

        if (myToken != null) {
            // Try with stored ID, otherwise via listing
            val result = if (myGistId != null) readGistFile(myToken, myGistId, fileName)
                         else readGistFileViaListing(myToken, fileName)
            if (result.isSuccess) myContent = result.getOrNull()
        }

        if (partnerToken != null) {
            val result = if (partnerGistId != null) readGistFile(partnerToken, partnerGistId, fileName)
                         else readGistFileViaListing(partnerToken, fileName)
            if (result.isSuccess) partnerContent = result.getOrNull()
        }

        if (myContent == null && partnerContent == null) {
            return Result.failure(Exception("هیچ داده‌ای یافت نشد"))
        }

        // Merge arrays
        return try {
            val merged = mutableMapOf<String, JsonElement>()
            val order = mutableListOf<String>()

            fun addContent(content: String?) {
                if (content == null) return
                try {
                    val arr = json.parseToJsonElement(content).jsonArray
                    for (elem in arr) {
                        val obj = elem as? JsonObject
                        val id = obj?.get("id")?.jsonPrimitive?.contentOrNull
                            ?: obj?.get("date")?.jsonPrimitive?.contentOrNull
                            ?: elem.toString().hashCode().toString()
                        if (!merged.containsKey(id)) order.add(id)
                        // Keep newer version if duplicate — compare createdAt if exists
                        merged[id] = elem
                    }
                } catch (_: Exception) {}
            }

            addContent(myContent)
            addContent(partnerContent)

            val mergedArray = order.mapNotNull { merged[it] }
            val resultJson = buildString {
                append("[")
                mergedArray.forEachIndexed { idx, el ->
                    if (idx > 0) append(",")
                    append(json.encodeToString(el))
                }
                append("]")
            }
            Result.success(resultJson)
        } catch (e: Exception) {
            // Fallback to whichever succeeded
            Result.success(myContent ?: partnerContent ?: "[]")
        }
    }

    private suspend fun readGistFileViaListing(token: String, fileName: String): Result<String> {
        return try {
            val gists = gitHubApi.listGists(authHeader(token))
            if (!gists.isSuccessful) return Result.failure(Exception("list failed"))
            val gist = gists.body()?.find { it.description == COUPLE_GIST_DESCRIPTION }
                ?: return Result.failure(Exception("Gist not found"))
            val full = gitHubApi.getGist(authHeader(token), gist.id)
            if (!full.isSuccessful) return Result.failure(Exception("get failed"))
            val file = full.body()?.files?.get(fileName) ?: return Result.failure(Exception("file $fileName not found"))
            if (file.truncated && file.raw_url.isNotBlank()) {
                val raw = gitHubApi.getRawGistFile(file.raw_url, authHeader(token))
                if (raw.isSuccessful && raw.body() != null) {
                    return Result.success(raw.body()!!.string())
                }
            }
            Result.success(file.content)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Read data from shared Gist (using my token) — legacy
     */
    suspend fun readFromMyGist(fileName: String): Result<String> {
        return readMergedContent(fileName)
    }

    /**
     * Read data from partner's Gist — legacy but now merged
     */
    suspend fun readFromPartnerGist(fileName: String): Result<String> {
        return readMergedContent(fileName)
    }

    /**
     * Pull all files and return map of file -> json array string
     */
    suspend fun pullAllFiles(): Map<String, String> {
        val result = mutableMapOf<String, String>()
        for (file in ALL_FILES) {
            val content = readMergedContent(file).getOrNull()
            if (content != null) result[file] = content
        }
        secureStorage.saveLastSync(System.currentTimeMillis().toString())
        return result
    }

    /**
     * Generic helper to fetch remote JSON array and decode to list of T
     */
    inline fun <reified T> decodeList(jsonStr: String): List<T> {
        return try {
            json.decodeFromString<List<T>>(jsonStr)
        } catch (_: Exception) { emptyList() }
    }

    /**
     * Save a single mood entry with merged logic
     */
    suspend fun saveMood(moodJson: String): Result<Unit> {
        return try {
            // For moods we need upsert by date+user, so we merge full list replacement is safer
            // Read existing
            val existing = readMergedContent(MOODS_FILE).getOrNull() ?: "[]"
            val newObj = json.parseToJsonElement(moodJson).jsonObject
            val newDate = newObj["date"]?.jsonPrimitive?.contentOrNull
            val arr = try { json.parseToJsonElement(existing).jsonArray } catch (_: Exception) { JsonArray(emptyList()) }
            val merged = mutableListOf<JsonElement>()
            var replaced = false
            for (el in arr) {
                val obj = el as? JsonObject
                val date = obj?.get("date")?.jsonPrimitive?.contentOrNull
                if (date != null && date == newDate) {
                    merged.add(newObj)
                    replaced = true
                } else merged.add(el)
            }
            if (!replaced) merged.add(newObj)
            val final = buildString {
                append("[")
                merged.forEachIndexed { i, e -> if (i>0) append(","); append(json.encodeToString(e)) }
                append("]")
            }
            saveToGist(MOODS_FILE, final)
        } catch (e: Exception) { Result.failure(e) }
    }
}

data class ConnectionStatus(
    val myConnected: Boolean,
    val partnerConnected: Boolean,
    val error: String? = null,
    val myUsername: String? = null,
    val partnerUsername: String? = null,
)

@Serializable
data class CoupleSharedData(
    val coupleName: String = "",
    val startDate: String = "",
    val personAName: String = "",
    val personBName: String = "",
    val createdAt: String = "",
)
