package com.coupleos.app.security.crypto

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import java.security.MessageDigest
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Cryptographic operations using Android Keystore.
 */
@Singleton
class CryptoManager @Inject constructor() {

    companion object {
        private const val KEYSTORE_PROVIDER = "AndroidKeyStore"
        private const val ENCRYPTION_KEY_ALIAS = "couple_os_encryption_key"
        private const val GCM_TAG_LENGTH = 128
    }

    private val keyStore: KeyStore? = try {
        KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }
    } catch (_: Throwable) {
        null
    }

    private fun getOrCreateKey(): SecretKey {
        val store = keyStore ?: throw IllegalStateException("AndroidKeyStore unavailable")
        val existingKey = store.getEntry(ENCRYPTION_KEY_ALIAS, null)
        if (existingKey is KeyStore.SecretKeyEntry) {
            return existingKey.secretKey
        }

        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            KEYSTORE_PROVIDER
        )
        keyGenerator.init(
            KeyGenParameterSpec.Builder(
                ENCRYPTION_KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return keyGenerator.generateKey()
    }

    fun encrypt(data: ByteArray): EncryptedData {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        val encryptedBytes = cipher.doFinal(data)
        return EncryptedData(
            cipherText = encryptedBytes,
            iv = cipher.iv
        )
    }

    fun decrypt(encryptedData: EncryptedData): ByteArray {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(GCM_TAG_LENGTH, encryptedData.iv)
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), spec)
        return cipher.doFinal(encryptedData.cipherText)
    }

    fun hashPin(pin: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(pin.toByteArray(Charsets.UTF_8))
        return hashBytes.joinToString("") { "%02x".format(it) }
    }

    fun verifyPin(pin: String, hash: String): Boolean {
        return hashPin(pin) == hash
    }

    fun generateDeviceId(): String {
        return UUID.randomUUID().toString()
    }

    fun generateId(): String {
        return UUID.randomUUID().toString()
    }
}

data class EncryptedData(
    val cipherText: ByteArray,
    val iv: ByteArray
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is EncryptedData) return false
        return cipherText.contentEquals(other.cipherText) && iv.contentEquals(other.iv)
    }

    override fun hashCode(): Int {
        var result = cipherText.contentHashCode()
        result = 31 * result + iv.contentHashCode()
        return result
    }
}
