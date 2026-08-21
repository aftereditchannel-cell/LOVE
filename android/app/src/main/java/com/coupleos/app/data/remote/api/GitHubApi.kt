package com.coupleos.app.data.remote.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.*

/**
 * GitHub API — used to validate tokens and to actually persist couple data as Gists.
 *
 * Every person owns one private ("secret") Gist described as [CoupleOS-SharedData].
 * The app holds BOTH tokens, so it can write to its own Gist and read the partner's
 * Gist, which is what makes real two-way sync possible without any backend server.
 */
interface GitHubApi {

    @GET("user")
    suspend fun getUser(
        @Header("Authorization") auth: String
    ): Response<GitHubUser>

    /** Gists owned by the authenticated token. */
    @GET("gists")
    suspend fun listGists(
        @Header("Authorization") auth: String,
        @Query("per_page") perPage: Int = 100,
        @Query("page") page: Int = 1
    ): Response<List<GitHubGist>>

    @POST("gists")
    suspend fun createGist(
        @Header("Authorization") auth: String,
        @Body gist: CreateGistRequest
    ): Response<GitHubGist>

    @PATCH("gists/{id}")
    suspend fun updateGist(
        @Header("Authorization") auth: String,
        @Path("id") id: String,
        @Body gist: UpdateGistRequest
    ): Response<GitHubGist>

    @GET("gists/{id}")
    suspend fun getGist(
        @Header("Authorization") auth: String,
        @Path("id") id: String
    ): Response<GitHubGist>

    /**
     * Files bigger than ~1MB are returned truncated by the Gist API.
     * In that case GitHub gives us a `raw_url` that we download directly.
     */
    @GET
    suspend fun getRawFile(
        @Header("Authorization") auth: String,
        @Url url: String
    ): Response<ResponseBody>
}

@Serializable
data class GitHubUser(
    val login: String = "",
    val id: Long = 0,
    val name: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
)

@Serializable
data class GitHubGist(
    val id: String = "",
    // GitHub returns `null` for gists without a description — must stay nullable.
    val description: String? = null,
    val files: Map<String, GistFile> = emptyMap(),
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    val public: Boolean = false,
    @SerialName("html_url") val htmlUrl: String? = null,
)

@Serializable
data class GistFile(
    val filename: String = "",
    // `content` is only present on GET /gists/{id}, never on the list endpoint.
    val content: String? = null,
    val size: Int = 0,
    val truncated: Boolean = false,
    @SerialName("raw_url") val rawUrl: String? = null,
)

@Serializable
data class CreateGistRequest(
    val description: String,
    val public: Boolean = false,
    val files: Map<String, GistFileContent>,
)

@Serializable
data class UpdateGistRequest(
    val description: String? = null,
    val files: Map<String, GistFileContent>,
)

@Serializable
data class GistFileContent(
    val content: String,
)
