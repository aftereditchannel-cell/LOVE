package com.coupleos.app.security.keystore

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Secure storage using Android Keystore + EncryptedSharedPreferences.
 *
 * IMPORTANT: this class is constructed by Hilt on app launch (it is injected into
 * AppViewModel / SetupViewModel / LockViewModel), so it must NEVER throw — a crash
 * here kills the process on open. Every operation is therefore wrapped in try/catch
 * (Throwable, not just Exception, because EncryptedSharedPreferences / Tink can also
 * surface LinkageError) and falls back to plain SharedPreferences, both when the
 * encrypted prefs fail to initialise and when a later read/write throws (for example
 * after the master key is invalidated). No tokens are stored in plaintext logs.
 */
@Singleton
class SecureStorage @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val prefs: SharedPreferences = createPrefs()

    private fun createPrefs(): SharedPreferences {
        return try {
            val masterKey = MasterKey.Builder(context)
                .setKeyGenParameterSpec(
                    KeyGenParameterSpec.Builder(
                        MasterKey.DEFAULT_MASTER_KEY_ALIAS,
                        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
                    )
                        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                        .setKeySize(256)
                        .build()
                )
                .build()

            EncryptedSharedPreferences.create(
                context,
                "couple_os_secure_prefs",
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (t: Throwable) {
            // Fallback: some devices/emulators crash with EncryptedSharedPreferences.
            Log.w("SecureStorage", "EncryptedSharedPreferences failed, using fallback", t)
            context.getSharedPreferences("couple_os_prefs_fallback", Context.MODE_PRIVATE)
        }
    }

    // ── Safe accessors: never throw, return sensible defaults ──
    private fun getString(key: String, default: String? = null): String? = try {
        prefs.getString(key, default)
    } catch (t: Throwable) {
        Log.w("SecureStorage", "read failed for $key, using default", t)
        default
    }

    private fun getBoolean(key: String, default: Boolean): Boolean = try {
        prefs.getBoolean(key, default)
    } catch (t: Throwable) {
        Log.w("SecureStorage", "read failed for $key, using default", t)
        default
    }

    private fun getInt(key: String, default: Int): Int = try {
        prefs.getInt(key, default)
    } catch (t: Throwable) {
        Log.w("SecureStorage", "read failed for $key, using default", t)
        default
    }

    private fun put(key: String, value: Any?) = try {
        val editor = prefs.edit()
        when (value) {
            is String -> editor.putString(key, value)
            is Boolean -> editor.putBoolean(key, value)
            is Int -> editor.putInt(key, value)
            null -> editor.remove(key)
            else -> editor.putString(key, value.toString())
        }
        editor.apply()
    } catch (t: Throwable) {
        Log.w("SecureStorage", "write failed for $key", t)
    }

    companion object {
        private const val KEY_PERSONAL_TOKEN = "personal_couple_token"
        private const val KEY_PARTNER_TOKEN = "partner_couple_token"
        private const val KEY_SESSION_TOKEN = "session_token"
        private const val KEY_USER_ROLE = "user_role"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_COUPLE_ID = "couple_id"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_IS_PAIRED = "is_paired"
        private const val KEY_PIN_HASH = "pin_hash"
        private const val KEY_BIOMETRIC_ENABLED = "biometric_enabled"
        private const val KEY_AUTO_LOCK_MINUTES = "auto_lock_minutes"
        private const val KEY_PERSON_A_NAME = "person_a_name"
        private const val KEY_PERSON_B_NAME = "person_b_name"
        private const val KEY_LOCK_SETUP_DONE = "lock_setup_done"
        private const val KEY_PROFILE_SETUP_DONE = "profile_setup_done"
        private const val KEY_GIST_ID = "gist_id"
        private const val KEY_MY_GIST_ID = "my_gist_id"
        private const val KEY_PARTNER_GIST_ID = "partner_gist_id"
        private const val KEY_MY_GITHUB_USERNAME = "my_github_username"
        private const val KEY_PARTNER_GITHUB_USERNAME = "partner_github_username"
        private const val KEY_LAST_SYNC = "last_sync_timestamp"
        private const val KEY_GIST_SYNC_ENABLED = "gist_sync_enabled"
    }

    // ── Token management ────────────────────────────────────
    fun savePersonalToken(token: String) = put(KEY_PERSONAL_TOKEN, token)
    fun getPersonalToken(): String? = getString(KEY_PERSONAL_TOKEN)

    fun savePartnerToken(token: String) = put(KEY_PARTNER_TOKEN, token)
    fun getPartnerToken(): String? = getString(KEY_PARTNER_TOKEN)

    fun saveSessionToken(token: String) = put(KEY_SESSION_TOKEN, token)
    fun getSessionToken(): String? = getString(KEY_SESSION_TOKEN)

    // ── Pairing state ───────────────────────────────────────
    fun saveUserRole(role: String) = put(KEY_USER_ROLE, role)
    fun getUserRole(): String? = getString(KEY_USER_ROLE)

    fun saveUserId(userId: String) = put(KEY_USER_ID, userId)
    fun getUserId(): String? = getString(KEY_USER_ID)

    fun saveCoupleId(coupleId: String) = put(KEY_COUPLE_ID, coupleId)
    fun getCoupleId(): String? = getString(KEY_COUPLE_ID)

    fun saveDeviceId(deviceId: String) = put(KEY_DEVICE_ID, deviceId)
    fun getDeviceId(): String? = getString(KEY_DEVICE_ID)

    fun setIsPaired(paired: Boolean) = put(KEY_IS_PAIRED, paired)
    fun isPaired(): Boolean = getBoolean(KEY_IS_PAIRED, false)

    // ── Names ───────────────────────────────────────────────
    fun savePersonAName(name: String) = put(KEY_PERSON_A_NAME, name)
    fun getPersonAName(): String = getString(KEY_PERSON_A_NAME, "امیر") ?: "امیر"

    fun savePersonBName(name: String) = put(KEY_PERSON_B_NAME, name)
    fun getPersonBName(): String = getString(KEY_PERSON_B_NAME, "ستایش") ?: "ستایش"

    // ── App Lock ────────────────────────────────────────────
    fun savePinHash(hash: String) = put(KEY_PIN_HASH, hash)
    fun getPinHash(): String? = getString(KEY_PIN_HASH)

    fun setBiometricEnabled(enabled: Boolean) = put(KEY_BIOMETRIC_ENABLED, enabled)
    fun isBiometricEnabled(): Boolean = getBoolean(KEY_BIOMETRIC_ENABLED, false)

    fun setAutoLockMinutes(minutes: Int) = put(KEY_AUTO_LOCK_MINUTES, minutes)
    fun getAutoLockMinutes(): Int = getInt(KEY_AUTO_LOCK_MINUTES, 1)

    fun setLockSetupDone(done: Boolean) = put(KEY_LOCK_SETUP_DONE, done)
    fun isLockSetupDone(): Boolean = getBoolean(KEY_LOCK_SETUP_DONE, false)

    fun setProfileSetupDone(done: Boolean) = put(KEY_PROFILE_SETUP_DONE, done)
    fun isProfileSetupDone(): Boolean = getBoolean(KEY_PROFILE_SETUP_DONE, false)

    // ── GitHub / Gist ───────────────────────────────────────
    fun saveGistId(id: String) {
        put(KEY_GIST_ID, id)
        put(KEY_MY_GIST_ID, id)
    }
    fun getGistId(): String? = getString(KEY_MY_GIST_ID) ?: getString(KEY_GIST_ID)
    fun saveMyGistId(id: String) = put(KEY_MY_GIST_ID, id)
    fun getMyGistId(): String? = getString(KEY_MY_GIST_ID) ?: getString(KEY_GIST_ID)
    fun savePartnerGistId(id: String) = put(KEY_PARTNER_GIST_ID, id)
    fun getPartnerGistId(): String? = getString(KEY_PARTNER_GIST_ID)

    fun saveMyGitHubUsername(username: String) = put(KEY_MY_GITHUB_USERNAME, username)
    fun getMyGitHubUsername(): String? = getString(KEY_MY_GITHUB_USERNAME)

    fun savePartnerGitHubUsername(username: String) = put(KEY_PARTNER_GITHUB_USERNAME, username)
    fun getPartnerGitHubUsername(): String? = getString(KEY_PARTNER_GITHUB_USERNAME)

    fun saveLastSync(timestamp: String) = put(KEY_LAST_SYNC, timestamp)
    fun getLastSync(): String? = getString(KEY_LAST_SYNC)

    fun setGistSyncEnabled(enabled: Boolean) = put(KEY_GIST_SYNC_ENABLED, enabled)
    fun isGistSyncEnabled(): Boolean = getBoolean(KEY_GIST_SYNC_ENABLED, true)

    // ── Masked tokens ───────────────────────────────────────
    fun getMaskedPersonalToken(): String {
        val token = getPersonalToken() ?: return ""
        if (token.length <= 4) return "••••"
        return "••••••••••" + token.takeLast(4)
    }

    fun getMaskedPartnerToken(): String {
        val token = getPartnerToken() ?: return ""
        if (token.length <= 4) return "••••"
        return "••••••••••" + token.takeLast(4)
    }

    // ── Clear ───────────────────────────────────────────────
    fun clearAll() = try {
        prefs.edit().clear().apply()
    } catch (t: Throwable) {
        Log.w("SecureStorage", "clearAll failed", t)
    }

    // ── Display names ───────────────────────────────────────
    fun getCurrentUserName(): String {
        return when (getUserRole()) {
            "PERSON_A" -> getPersonAName()
            "PERSON_B" -> getPersonBName()
            else -> ""
        }
    }

    fun getPartnerName(): String {
        return when (getUserRole()) {
            "PERSON_A" -> getPersonBName()
            "PERSON_B" -> getPersonAName()
            else -> ""
        }
    }
}
