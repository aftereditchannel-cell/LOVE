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
 * Falls back to regular SharedPreferences if encryption fails (some devices).
 * No tokens are stored in plaintext logs.
 */
@Singleton
class SecureStorage @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val prefs: SharedPreferences = try {
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
    } catch (e: Exception) {
        // Fallback: some devices/emulators crash with EncryptedSharedPreferences
        Log.w("SecureStorage", "EncryptedSharedPreferences failed, using fallback", e)
        context.getSharedPreferences("couple_os_prefs_fallback", Context.MODE_PRIVATE)
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
    fun savePersonalToken(token: String) = prefs.edit().putString(KEY_PERSONAL_TOKEN, token).apply()
    fun getPersonalToken(): String? = prefs.getString(KEY_PERSONAL_TOKEN, null)

    fun savePartnerToken(token: String) = prefs.edit().putString(KEY_PARTNER_TOKEN, token).apply()
    fun getPartnerToken(): String? = prefs.getString(KEY_PARTNER_TOKEN, null)

    fun saveSessionToken(token: String) = prefs.edit().putString(KEY_SESSION_TOKEN, token).apply()
    fun getSessionToken(): String? = prefs.getString(KEY_SESSION_TOKEN, null)

    // ── Pairing state ───────────────────────────────────────
    fun saveUserRole(role: String) = prefs.edit().putString(KEY_USER_ROLE, role).apply()
    fun getUserRole(): String? = prefs.getString(KEY_USER_ROLE, null)

    fun saveUserId(userId: String) = prefs.edit().putString(KEY_USER_ID, userId).apply()
    fun getUserId(): String? = prefs.getString(KEY_USER_ID, null)

    fun saveCoupleId(coupleId: String) = prefs.edit().putString(KEY_COUPLE_ID, coupleId).apply()
    fun getCoupleId(): String? = prefs.getString(KEY_COUPLE_ID, null)

    fun saveDeviceId(deviceId: String) = prefs.edit().putString(KEY_DEVICE_ID, deviceId).apply()
    fun getDeviceId(): String? = prefs.getString(KEY_DEVICE_ID, null)

    fun setIsPaired(paired: Boolean) = prefs.edit().putBoolean(KEY_IS_PAIRED, paired).apply()
    fun isPaired(): Boolean = prefs.getBoolean(KEY_IS_PAIRED, false)

    // ── Names ───────────────────────────────────────────────
    fun savePersonAName(name: String) = prefs.edit().putString(KEY_PERSON_A_NAME, name).apply()
    fun getPersonAName(): String = prefs.getString(KEY_PERSON_A_NAME, "امیر") ?: "امیر"

    fun savePersonBName(name: String) = prefs.edit().putString(KEY_PERSON_B_NAME, name).apply()
    fun getPersonBName(): String = prefs.getString(KEY_PERSON_B_NAME, "ستایش") ?: "ستایش"

    // ── App Lock ────────────────────────────────────────────
    fun savePinHash(hash: String) = prefs.edit().putString(KEY_PIN_HASH, hash).apply()
    fun getPinHash(): String? = prefs.getString(KEY_PIN_HASH, null)

    fun setBiometricEnabled(enabled: Boolean) = prefs.edit().putBoolean(KEY_BIOMETRIC_ENABLED, enabled).apply()
    fun isBiometricEnabled(): Boolean = prefs.getBoolean(KEY_BIOMETRIC_ENABLED, false)

    fun setAutoLockMinutes(minutes: Int) = prefs.edit().putInt(KEY_AUTO_LOCK_MINUTES, minutes).apply()
    fun getAutoLockMinutes(): Int = prefs.getInt(KEY_AUTO_LOCK_MINUTES, 1)

    fun setLockSetupDone(done: Boolean) = prefs.edit().putBoolean(KEY_LOCK_SETUP_DONE, done).apply()
    fun isLockSetupDone(): Boolean = prefs.getBoolean(KEY_LOCK_SETUP_DONE, false)

    fun setProfileSetupDone(done: Boolean) = prefs.edit().putBoolean(KEY_PROFILE_SETUP_DONE, done).apply()
    fun isProfileSetupDone(): Boolean = prefs.getBoolean(KEY_PROFILE_SETUP_DONE, false)

    // ── GitHub / Gist ───────────────────────────────────────
    fun saveGistId(id: String) {
        prefs.edit().putString(KEY_GIST_ID, id).putString(KEY_MY_GIST_ID, id).apply()
    }
    fun getGistId(): String? = prefs.getString(KEY_MY_GIST_ID, null) ?: prefs.getString(KEY_GIST_ID, null)
    fun saveMyGistId(id: String) = prefs.edit().putString(KEY_MY_GIST_ID, id).apply()
    fun getMyGistId(): String? = prefs.getString(KEY_MY_GIST_ID, null) ?: prefs.getString(KEY_GIST_ID, null)
    fun savePartnerGistId(id: String) = prefs.edit().putString(KEY_PARTNER_GIST_ID, id).apply()
    fun getPartnerGistId(): String? = prefs.getString(KEY_PARTNER_GIST_ID, null)

    fun saveMyGitHubUsername(username: String) = prefs.edit().putString(KEY_MY_GITHUB_USERNAME, username).apply()
    fun getMyGitHubUsername(): String? = prefs.getString(KEY_MY_GITHUB_USERNAME, null)

    fun savePartnerGitHubUsername(username: String) = prefs.edit().putString(KEY_PARTNER_GITHUB_USERNAME, username).apply()
    fun getPartnerGitHubUsername(): String? = prefs.getString(KEY_PARTNER_GITHUB_USERNAME, null)

    fun saveLastSync(timestamp: String) = prefs.edit().putString(KEY_LAST_SYNC, timestamp).apply()
    fun getLastSync(): String? = prefs.getString(KEY_LAST_SYNC, null)

    fun setGistSyncEnabled(enabled: Boolean) = prefs.edit().putBoolean(KEY_GIST_SYNC_ENABLED, enabled).apply()
    fun isGistSyncEnabled(): Boolean = prefs.getBoolean(KEY_GIST_SYNC_ENABLED, true)

    // ── Ownership registry ──────────────────────────────────
    /**
     * Ids of items that came from the PARTNER's token for a given data file.
     * Those items are read-only on this device: they must never be written back
     * to my gist, edited or deleted from here.
     */
    fun savePartnerOwnedIds(fileName: String, ids: Set<String>) =
        prefs.edit().putStringSet("partner_ids_$fileName", ids).apply()

    fun getPartnerOwnedIds(fileName: String): Set<String> =
        prefs.getStringSet("partner_ids_$fileName", emptySet()) ?: emptySet()

    fun addPartnerOwnedIds(fileName: String, ids: Set<String>) {
        if (ids.isEmpty()) return
        val merged = getPartnerOwnedIds(fileName).toMutableSet()
        merged.addAll(ids)
        savePartnerOwnedIds(fileName, merged)
    }

    fun isPartnerOwned(fileName: String, id: String): Boolean =
        getPartnerOwnedIds(fileName).contains(id)

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
    fun clearAll() = prefs.edit().clear().apply()

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
