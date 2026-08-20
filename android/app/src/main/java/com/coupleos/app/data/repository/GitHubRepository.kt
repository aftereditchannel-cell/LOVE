package com.coupleos.app.data.repository

import com.coupleos.app.data.remote.api.*
import com.coupleos.app.security.keystore.SecureStorage
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for syncing data with GitHub via Gists.
 *
 * Architecture:
 * - Each person has their own GitHub token (ghp_...)
 * - A shared private Gist stores couple data
 * - Personal Gist stores private data
 * - Both tokens can read/write the shared Gist
 *
 * The "personal token" = your own GitHub PAT
 * The "partner token" = your partner's GitHub PAT
 * We use YOUR token to write YOUR data, PARTNER token to READ partner data
 */
@Singleton
class GitHubRepository @Inject constructor(
    private val gitHubApi: GitHubApi,
    private val secureStorage: SecureStorage,
    private val json: Json,
) {
    companion object {
        const val COUPLE_GIST_DESCRIPTION = "CoupleOS-SharedData"
        const val PERSONAL_GIST_DESCRIPTION = "CoupleOS-PersonalData"
        const val SHARED_FILE = "couple_shared.json"
        const val MOODS_FILE = "moods.json"
        const val MEMORIES_FILE = "memories.json"
        const val MESSAGES_FILE = "messages.json"
        const val CALENDAR_FILE = "calendar.json"
        const val TASKS_FILE = "tasks.json"
        const val JOURNAL_FILE = "journal.json"
    }

    private fun authHeader(token: String): String = "Bearer $token"

    // ── Token Validation ────────────────────────────────────

    /**
     * Validate a GitHub token by calling /user
     * Returns the GitHub username or null if invalid
     */
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

    /**
     * Check connection status for both tokens
     */
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
     * Find or create the shared couple Gist using my token
     */
    suspend fun getOrCreateSharedGist(): Result<String> {
        val token = secureStorage.getPersonalToken()
            ?: return Result.failure(Exception("توکن یافت نشد"))

        return try {
            // Search existing gists
            val gists = gitHubApi.listGists(authHeader(token))
            if (!gists.isSuccessful) {
                return Result.failure(Exception("خطا در دریافت Gist‌ها"))
            }

            val existing = gists.body()?.find { it.description == COUPLE_GIST_DESCRIPTION }
            if (existing != null) {
                secureStorage.saveGistId(existing.id)
                return Result.success(existing.id)
            }

            // Create new shared gist
            val initialData = CoupleSharedData()
            val createResponse = gitHubApi.createGist(
                authHeader(token),
                CreateGistRequest(
                    description = COUPLE_GIST_DESCRIPTION,
                    public = false,
                    files = mapOf(
                        SHARED_FILE to GistFileContent(json.encodeToString(initialData)),
                        MOODS_FILE to GistFileContent("[]"),
                        MEMORIES_FILE to GistFileContent("[]"),
                        MESSAGES_FILE to GistFileContent("[]"),
                        CALENDAR_FILE to GistFileContent("[]"),
                        TASKS_FILE to GistFileContent("[]"),
                    )
                )
            )

            if (createResponse.isSuccessful && createResponse.body() != null) {
                val gistId = createResponse.body()!!.id
                secureStorage.saveGistId(gistId)
                Result.success(gistId)
            } else {
                Result.failure(Exception("خطا در ساخت Gist"))
            }
        } catch (e: Exception) {
            Result.failure(Exception("خطا در اتصال: ${e.localizedMessage}"))
        }
    }

    // ── Data Sync ───────────────────────────────────────────

    /**
     * Save data to the shared Gist
     */
    suspend fun saveToGist(fileName: String, content: String): Result<Unit> {
        val token = secureStorage.getPersonalToken()
            ?: return Result.failure(Exception("توکن یافت نشد"))
        val gistId = secureStorage.getGistId()
            ?: getOrCreateSharedGist().getOrNull()
            ?: return Result.failure(Exception("Gist یافت نشد"))

        return try {
            val response = gitHubApi.updateGist(
                authHeader(token),
                gistId,
                UpdateGistRequest(
                    files = mapOf(fileName to GistFileContent(content))
                )
            )
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("خطا در ذخیره‌سازی (کد ${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(Exception("خطا در اتصال: ${e.localizedMessage}"))
        }
    }

    /**
     * Read data from shared Gist (using my token)
     */
    suspend fun readFromMyGist(fileName: String): Result<String> {
        val token = secureStorage.getPersonalToken()
            ?: return Result.failure(Exception("توکن یافت نشد"))
        return readGistFile(token, fileName)
    }

    /**
     * Read data from partner's Gist (using partner token)
     * This lets us see data the partner has written
     */
    suspend fun readFromPartnerGist(fileName: String): Result<String> {
        val token = secureStorage.getPartnerToken()
            ?: return Result.failure(Exception("توکن پارتنر یافت نشد"))
        return readGistFile(token, fileName)
    }

    private suspend fun readGistFile(token: String, fileName: String): Result<String> {
        return try {
            // Find the couple gist
            val gists = gitHubApi.listGists(authHeader(token))
            if (!gists.isSuccessful) {
                return Result.failure(Exception("خطا در دریافت Gist‌ها"))
            }

            val gist = gists.body()?.find { it.description == COUPLE_GIST_DESCRIPTION }
                ?: return Result.failure(Exception("Gist مشترک یافت نشد"))

            // Get full gist content
            val fullGist = gitHubApi.getGist(authHeader(token), gist.id)
            if (!fullGist.isSuccessful) {
                return Result.failure(Exception("خطا در خواندن Gist"))
            }

            val file = fullGist.body()?.files?.get(fileName)
                ?: return Result.failure(Exception("فایل $fileName یافت نشد"))

            Result.success(file.content)
        } catch (e: Exception) {
            Result.failure(Exception("خطا در اتصال: ${e.localizedMessage}"))
        }
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
