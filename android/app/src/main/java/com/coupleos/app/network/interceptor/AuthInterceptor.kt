package com.coupleos.app.network.interceptor

import com.coupleos.app.security.keystore.SecureStorage
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Adds the session token to all API requests.
 * Token is retrieved from encrypted storage — never logged or exposed.
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val secureStorage: SecureStorage
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        val sessionToken = secureStorage.getSessionToken()
        if (sessionToken.isNullOrEmpty()) {
            return chain.proceed(originalRequest)
        }

        val authenticatedRequest = originalRequest.newBuilder()
            .header("Authorization", "Bearer $sessionToken")
            .header("X-Device-Id", secureStorage.getDeviceId() ?: "")
            .header("X-Couple-Id", secureStorage.getCoupleId() ?: "")
            .build()

        return chain.proceed(authenticatedRequest)
    }
}
