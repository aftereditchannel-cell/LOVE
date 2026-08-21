package com.coupleos.app.data.local.dao

import androidx.room.*
import com.coupleos.app.data.local.entity.MemoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface MemoryDao {
    @Query("SELECT * FROM memories WHERE deletedAt IS NULL ORDER BY date DESC")
    fun getAllMemories(): Flow<List<MemoryEntity>>

    @Query("SELECT * FROM memories WHERE privacy = 'SHARED' AND deletedAt IS NULL ORDER BY date DESC")
    fun getSharedMemories(): Flow<List<MemoryEntity>>

    @Query("SELECT * FROM memories WHERE createdBy = :userId AND privacy = 'PRIVATE' AND deletedAt IS NULL ORDER BY date DESC")
    fun getPrivateMemories(userId: String): Flow<List<MemoryEntity>>

    @Query("SELECT * FROM memories WHERE isFavorite = 1 AND deletedAt IS NULL ORDER BY date DESC")
    fun getFavoriteMemories(): Flow<List<MemoryEntity>>

    @Query("SELECT * FROM memories WHERE id = :id AND deletedAt IS NULL")
    suspend fun getMemoryById(id: String): MemoryEntity?

    @Query("SELECT * FROM memories WHERE (title LIKE '%' || :query || '%' OR description LIKE '%' || :query || '%' OR tags LIKE '%' || :query || '%') AND deletedAt IS NULL ORDER BY date DESC")
    fun searchMemories(query: String): Flow<List<MemoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(memory: MemoryEntity)

    @Update
    suspend fun update(memory: MemoryEntity)

    @Query("UPDATE memories SET deletedAt = :deletedAt WHERE id = :id")
    suspend fun softDelete(id: String, deletedAt: String)

    @Query("SELECT * FROM memories WHERE isSynced = 0 AND deletedAt IS NULL")
    suspend fun getUnsyncedMemories(): List<MemoryEntity>

    @Query("UPDATE memories SET isSynced = 1 WHERE id = :id")
    suspend fun markSynced(id: String)

    @Query("SELECT COUNT(*) FROM memories WHERE deletedAt IS NULL")
    fun getMemoryCount(): Flow<Int>

    @Query("SELECT * FROM memories")
    suspend fun getAllOnce(): List<MemoryEntity>

    @Query("UPDATE memories SET isSynced = 1")
    suspend fun markAllSynced()

}
