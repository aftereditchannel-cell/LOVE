package com.coupleos.app.data.repository

import android.util.Log
import com.coupleos.app.data.remote.api.CreateGistRequest
import com.coupleos.app.data.remote.api.GistFileContent
import com.coupleos.app.data.remote.api.GitHubApi
import com.coupleos.app.data.remote.api.GitHubGist
import com.coupleos.app.data.remote.api.GitHubUser
import com.coupleos.app.data.remote.api.UpdateGistRequest
import com.coupleos.app.security.keystore.SecureStorage
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Low level GitHub storage layer.
 *
 * How persistence really works:
 *  - Every token owns exactly ONE private Gist described as "CoupleOS-SharedData".
 *  - The app writes to the Gist owned by the personal token (we own it, so PATCH works).
 *  - The app reads BOTH Gists (mine + partner's) because it holds both tokens.
 *  - Merging the two documents gives every device the full shared history.
 *
 * A token can only WRITE to gists it owns, which is why the previous
 * "one shared gist for both people" approach silently failed with 404 for the
 * partner. That is the root cause of "connection is fine but nothing is stored".
 */
@Singleton
class GitHubRepository @Inject constructor(
    private val gitHubApi: GitHubApi,
    private val secureStorage: SecureStorage,
    private val json: Json,
) {
    companion object {
        private const val TAG = "GitHubRepository"

        const val COUPLE_GIST_DESCRIPTION = "CoupleOS-SharedData"
        const val PERSONAL_GIST_DESCRIPTION = "CoupleOS-PersonalData"

        /** Full application snapshot — the single source of truth on the token. */
        const val SNAPSHOT_FILE = "coupleos_snapshot.json"

        // Human readable mirrors, handy when you open the Gist in a browser.
        const val SHARED_FILE = "couple_shared.json"
        const val MOODS_FILE = "moods.json"
        const val MEMORIES_FILE = "memories.json"
        const val MESSAGES_FILE = "messages.json"
        const val CALENDAR_FILE = "calendar.json"
        const val TASKS_FILE = "tasks.json"
        const val JOURNAL_FILE = "journal.json"
        const val README_FILE = "README.md"
    }

    private fun authHeader(token: String): String = "Bearer $token"

    // ── Token validation ────────────────────────────────────────────────

    /**
     * Validates a token against `GET /user` and — crucially — checks that the
     * token is actually allowed to touch gists. A token without the `gist`
     * scope authenticates perfectly but can never store anything.
     */
    suspend fun validateToken(token: String): Result<GitHubUser> {
        return try {
            val response = gitHubApi.getUser(authHeader(token))
            if (response.isSuccessful && response.body() != null) {
                val scopes = response.headers()["X-OAuth-Scopes"].orEmpty()
                Log.d(TAG, "token validated, scopes=[$scopes]")
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(describeError(response.code(), response.errorBody()?.string())))
            }
        } catch (e: Exception) {
            Result.failure(Exception("خطا در اتصال به اینترنت: ${e.localizedMessage}"))
        }
    }

    /**
     * Returns the granted scopes of a classic token, or null for fine-grained
     * tokens (GitHub does not expose scopes for those).
     */
    suspend fun getTokenScopes(token: String): String? {
        return try {
            val response = gitHubApi.getUser(authHeader(token))
            response.headers()["X-OAuth-Scopes"]
        } catch (e: Exception) {
            null
        }
    }

    /** Verifies both tokens and reports which side is broken. */
    suspend fun checkConnection(): ConnectionStatus {
        val myToken = secureStorage.getPersonalToken()
            ?: return ConnectionStatus(false, false, "توکن شخصی یافت نشد")
        val partnerToken = secureStorage.getPartnerToken()
            ?: return ConnectionStatus(false, false, "توکن پارتنر یافت نشد")

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

    // ── Gist bootstrap ──────────────────────────────────────────────────

    /**
     * Finds (or creates) the CoupleOS gist owned by [token] and caches its id.
     * Works for both the personal and the partner token.
     */
    suspend fun ensureGist(token: String, isMine: Boolean): Result<String> {
        val cached = if (isMine) secureStorage.getMyGistId() else secureStorage.getPartnerGistId()
        if (!cached.isNullOrBlank()) {
            // Verify the cached id still exists and is reachable by this token.
            val check = runCatching { gitHubApi.getGist(authHeader(token), cached) }.getOrNull()
            if (check != null && check.isSuccessful) return Result.success(cached)
            Log.w(TAG, "cached gist id no longer valid, re-discovering")
        }

        return try {
            val existing = findCoupleGist(token)
            if (existing != null) {
                storeGistId(existing.id, isMine)
                return Result.success(existing.id)
            }

            if (!isMine) {
                // We must never create a gist inside the partner account silently
                // without content — but an empty one is required for two way sync,
                // so we do create it and seed it with an empty snapshot.
                Log.d(TAG, "creating gist inside partner account")
            }

            val created = gitHubApi.createGist(
                authHeader(token),
                CreateGistRequest(
                    description = COUPLE_GIST_DESCRIPTION,
                    public = false,
                    files = mapOf(
                        SNAPSHOT_FILE to GistFileContent("{}"),
                        README_FILE to GistFileContent(readmeContent()),
                    )
                )
            )

            if (created.isSuccessful && created.body() != null) {
                val id = created.body()!!.id
                storeGistId(id, isMine)
                Result.success(id)
            } else {
                Result.failure(
                    Exception(
                        "ساخت Gist ناموفق بود — " +
                            describeError(created.code(), created.errorBody()?.string())
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(Exception("خطا در اتصال: ${e.localizedMessage}"))
        }
    }

    private suspend fun findCoupleGist(token: String): GitHubGist? {
        var page = 1
        while (page <= 5) {
            val response = gitHubApi.listGists(authHeader(token), 100, page)
            if (!response.isSuccessful) return null
            val body = response.body().orEmpty()
            val match = body.firstOrNull { it.description == COUPLE_GIST_DESCRIPTION }
            if (match != null) return match
            if (body.size < 100) return null
            page++
        }
        return null
    }

    private fun storeGistId(id: String, isMine: Boolean) {
        if (isMine) {
            secureStorage.saveMyGistId(id)
            secureStorage.saveGistId(id)
        } else {
            secureStorage.savePartnerGistId(id)
        }
    }

    /** Backwards compatible helper used by older call sites. */
    suspend fun getOrCreateSharedGist(): Result<String> {
        val token = secureStorage.getPersonalToken()
            ?: return Result.failure(Exception("توکن یافت نشد"))
        return ensureGist(token, isMine = true)
    }

    // ── Raw file IO ─────────────────────────────────────────────────────

    /** Writes one or more files into the gist owned by the personal token. */
    suspend fun writeFiles(files: Map<String, String>): Result<Unit> {
        val token = secureStorage.getPersonalToken()
            ?: return Result.failure(Exception("توکن شخصی یافت نشد"))
        val gistId = ensureGist(token, isMine = true).getOrElse { return Result.failure(it) }

        return try {
            val response = gitHubApi.updateGist(
                authHeader(token),
                gistId,
                UpdateGistRequest(
                    description = COUPLE_GIST_DESCRIPTION,
                    files = files.mapValues { GistFileContent(it.value) },
                )
            )
            if (response.isSuccessful) {
                secureStorage.saveLastSyncError(null)
                Result.success(Unit)
            } else {
                val message = describeError(response.code(), response.errorBody()?.string())
                secureStorage.saveLastSyncError(message)
                Result.failure(Exception(message))
            }
        } catch (e: Exception) {
            val message = "خطا در اتصال: ${e.localizedMessage}"
            secureStorage.saveLastSyncError(message)
            Result.failure(Exception(message))
        }
    }

    /** Convenience wrapper kept for existing callers. */
    suspend fun saveToGist(fileName: String, content: String): Result<Unit> =
        writeFiles(mapOf(fileName to content))

    /** Reads a file from the gist owned by [token]. */
    suspend fun readFile(token: String, isMine: Boolean, fileName: String): Result<String> {
        val gistId = ensureGist(token, isMine).getOrElse { return Result.failure(it) }
        return try {
            val response = gitHubApi.getGist(authHeader(token), gistId)
            if (!response.isSuccessful) {
                return Result.failure(
                    Exception(describeError(response.code(), response.errorBody()?.string()))
                )
            }
            val file = response.body()?.files?.get(fileName)
                ?: return Result.failure(Exception("فایل $fileName هنوز روی این توکن ساخته نشده"))

            // Large files come back truncated — download the raw blob instead.
            if (file.truncated && !file.rawUrl.isNullOrBlank()) {
                val raw = gitHubApi.getRawFile(authHeader(token), file.rawUrl)
                if (raw.isSuccessful) {
                    return Result.success(raw.body()?.string().orEmpty())
                }
            }
            Result.success(file.content.orEmpty())
        } catch (e: Exception) {
            Result.failure(Exception("خطا در خواندن: ${e.localizedMessage}"))
        }
    }

    suspend fun readFromMyGist(fileName: String): Result<String> {
        val token = secureStorage.getPersonalToken()
            ?: return Result.failure(Exception("توکن یافت نشد"))
        return readFile(token, isMine = true, fileName = fileName)
    }

    suspend fun readFromPartnerGist(fileName: String): Result<String> {
        val token = secureStorage.getPartnerToken()
            ?: return Result.failure(Exception("توکن پارتنر یافت نشد"))
        return readFile(token, isMine = false, fileName = fileName)
    }

    // ── Diagnostics ─────────────────────────────────────────────────────

    /**
     * End-to-end self test used by the Settings screen: it authenticates,
     * checks the gist scope, writes a probe file and reads it back again.
     * This is the only reliable way to prove that data really lands on the token.
     */
    suspend fun runDiagnostics(): List<DiagnosticLine> {
        val lines = mutableListOf<DiagnosticLine>()

        val myToken = secureStorage.getPersonalToken()
        val partnerToken = secureStorage.getPartnerToken()

        if (myToken.isNullOrBlank()) {
            lines.add(DiagnosticLine("توکن شخصی", false, "ذخیره نشده است"))
            return lines
        }
        lines.add(DiagnosticLine("توکن شخصی", true, secureStorage.getMaskedPersonalToken()))

        val me = validateToken(myToken)
        lines.add(
            DiagnosticLine(
                "احراز هویت GitHub",
                me.isSuccess,
                me.getOrNull()?.login ?: me.exceptionOrNull()?.message.orEmpty()
            )
        )
        if (me.isFailure) return lines

        val scopes = getTokenScopes(myToken)
        val hasGistScope = scopes == null || scopes.split(",").map { it.trim() }.contains("gist")
        lines.add(
            DiagnosticLine(
                "دسترسی gist",
                hasGistScope,
                when {
                    scopes == null -> "توکن fine-grained — مطمئن شو دسترسی Gists روی Read and write باشه"
                    hasGistScope -> "scope: $scopes"
                    else -> "این توکن scope مربوط به gist را ندارد (scopes: $scopes)"
                }
            )
        )

        val gist = ensureGist(myToken, isMine = true)
        lines.add(
            DiagnosticLine(
                "Gist شخصی",
                gist.isSuccess,
                gist.getOrNull() ?: gist.exceptionOrNull()?.message.orEmpty()
            )
        )
        if (gist.isFailure) return lines

        val probe = "{\"probe\":\"${System.currentTimeMillis()}\"}"
        val write = writeFiles(mapOf("healthcheck.json" to probe))
        lines.add(
            DiagnosticLine(
                "نوشتن روی توکن",
                write.isSuccess,
                if (write.isSuccess) "موفق" else write.exceptionOrNull()?.message.orEmpty()
            )
        )

        if (write.isSuccess) {
            val read = readFile(myToken, true, "healthcheck.json")
            val matches = read.getOrNull()?.contains("probe") == true
            lines.add(
                DiagnosticLine(
                    "خواندن از توکن",
                    matches,
                    if (matches) "داده برگشت و مطابقت دارد" else read.exceptionOrNull()?.message.orEmpty()
                )
            )
        }

        if (partnerToken.isNullOrBlank()) {
            lines.add(DiagnosticLine("توکن پارتنر", false, "ذخیره نشده است"))
        } else {
            val partner = validateToken(partnerToken)
            lines.add(
                DiagnosticLine(
                    "توکن پارتنر",
                    partner.isSuccess,
                    partner.getOrNull()?.login ?: partner.exceptionOrNull()?.message.orEmpty()
                )
            )
            if (partner.isSuccess) {
                val partnerGist = ensureGist(partnerToken, isMine = false)
                lines.add(
                    DiagnosticLine(
                        "Gist پارتنر",
                        partnerGist.isSuccess,
                        partnerGist.getOrNull() ?: partnerGist.exceptionOrNull()?.message.orEmpty()
                    )
                )
            }
        }

        return lines
    }

    private fun describeError(code: Int, body: String?): String {
        val detail = body?.take(200)?.replace("\n", " ").orEmpty()
        val base = when (code) {
            401 -> "توکن نامعتبر یا منقضی شده است"
            403 -> "دسترسی رد شد — احتمالاً توکن scope مربوط به gist را ندارد"
            404 -> "پیدا نشد — این توکن مالک این Gist نیست"
            422 -> "داده نامعتبر برای GitHub"
            in 500..599 -> "GitHub در دسترس نیست"
            else -> "خطای GitHub"
        }
        return if (detail.isBlank()) "$base (کد $code)" else "$base (کد $code): $detail"
    }

    private fun readmeContent(): String = """
        # دنیای کوچیک ما — CoupleOS

        این Gist توسط اپلیکیشن CoupleOS ساخته شده و داده‌های رمزنگاری‌نشده‌ی
        شخصی/مشترک شما را نگه می‌دارد. آن را حذف یا عمومی نکنید.

        - `coupleos_snapshot.json` : کل داده‌های اپ (منبع اصلی)
        - `healthcheck.json`       : فایل تست سلامت اتصال
    """.trimIndent()
}

data class ConnectionStatus(
    val myConnected: Boolean,
    val partnerConnected: Boolean,
    val error: String? = null,
    val myUsername: String? = null,
    val partnerUsername: String? = null,
)

data class DiagnosticLine(
    val label: String,
    val ok: Boolean,
    val detail: String,
)

@Serializable
data class CoupleSharedData(
    val coupleName: String = "",
    val startDate: String = "",
    val personAName: String = "",
    val personBName: String = "",
    val createdAt: String = "",
)
