package com.coupleos.app.data.local.dao

import androidx.room.*
import com.coupleos.app.data.local.entity.JournalEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface JournalDao {
    @Query("SELECT * FROM journal_entries WHERE deletedAt IS NULL ORDER BY date DESC")
    fun getAllEntries(): Flow<List<JournalEntity>>

    @Query("SELECT * FROM journal_entries WHERE createdBy = :userId AND privacy = 'PRIVATE' AND deletedAt IS NULL ORDER BY date DESC")
    fun getPrivateEntries(userId: String): Flow<List<JournalEntity>>

    @Query("SELECT * FROM journal_entries WHERE privacy = 'SHARED' AND deletedAt IS NULL ORDER BY date DESC")
    fun getSharedEntries(): Flow<List<JournalEntity>>

    @Query("SELECT * FROM journal_entries WHERE id = :id AND deletedAt IS NULL")
    suspend fun getEntryById(id: String): JournalEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entry: JournalEntity)

    @Update
    suspend fun update(entry: JournalEntity)

    @Query("UPDATE journal_entries SET deletedAt = :deletedAt WHERE id = :id")
    suspend fun softDelete(id: String, deletedAt: String)

    @Query("SELECT * FROM journal_entries WHERE isSynced = 0 AND deletedAt IS NULL")
    suspend fun getUnsyncedEntries(): List<JournalEntity>

    @Query("UPDATE journal_entries SET isSynced = 1 WHERE id = :id")
    suspend fun markSynced(id: String)

    @Query("SELECT * FROM journal_entries")
    suspend fun getAllOnce(): List<JournalEntity>

    @Query("UPDATE journal_entries SET isSynced = 1")
    suspend fun markAllSynced()

}
