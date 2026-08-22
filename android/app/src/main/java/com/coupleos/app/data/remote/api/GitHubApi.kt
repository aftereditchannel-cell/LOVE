package com.coupleos.app.data.remote.api

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.*

/**
 * GitHub API — used to validate tokens and sync data via Gists.
 * Each person's token (ghp_...) is used to authenticate with GitHub.
 * Data is stored as private Gists.
 */
interface GitHubApi {

    @GET("user")
    suspend fun getUser(
        @Header("Authorization") auth: String
    ): Response<GitHubUser>

    @GET("gists")
    suspend fun listGists(
        @Header("Authorization") auth: String,
        @Query("per_page") perPage: Int = 100
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
     * Fetch the full raw content of a gist file via its raw_url.
     * GitHub truncates `content` at ~1MB, so large files must be read here.
     */
    @GET
    suspend fun getRawGistFile(
        @Url url: String,
        @Header("Authorization") auth: String
    ): Response<okhttp3.ResponseBody>
}

@Serializable
data class GitHubUser(
    val login: String = "",
    val id: Long = 0,
    val name: String? = null,
    val avatar_url: String = "",
)

@Serializable
data class GitHubGist(
    val id: String = "",
    val description: String = "",
    val files: Map<String, GistFile> = emptyMap(),
    val created_at: String = "",
    val updated_at: String = "",
    val public: Boolean = false,
)

@Serializable
data class GistFile(
    val filename: String = "",
    val content: String = "",
    val size: Int = 0,
    val truncated: Boolean = false,
    val raw_url: String = "",
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
