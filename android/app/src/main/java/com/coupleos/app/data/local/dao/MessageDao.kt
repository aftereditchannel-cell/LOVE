package com.coupleos.app.data.local.dao

import androidx.room.*
import com.coupleos.app.data.local.entity.MessageEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface MessageDao {
    @Query("SELECT * FROM messages WHERE coupleId = :coupleId AND isDeleted = 0 ORDER BY createdAt DESC")
    fun getMessages(coupleId: String): Flow<List<MessageEntity>>

    @Query("SELECT * FROM messages WHERE coupleId = :coupleId AND isDeleted = 0 ORDER BY createdAt DESC LIMIT :limit")
    fun getRecentMessages(coupleId: String, limit: Int = 50): Flow<List<MessageEntity>>

    @Query("SELECT * FROM messages WHERE id = :id")
    suspend fun getMessageById(id: String): MessageEntity?

    @Query("SELECT * FROM messages WHERE isPinned = 1 AND coupleId = :coupleId AND isDeleted = 0 ORDER BY createdAt DESC")
    fun getPinnedMessages(coupleId: String): Flow<List<MessageEntity>>

    @Query("SELECT * FROM messages WHERE (content LIKE '%' || :query || '%') AND coupleId = :coupleId AND isDeleted = 0 ORDER BY createdAt DESC")
    fun searchMessages(coupleId: String, query: String): Flow<List<MessageEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(message: MessageEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(messages: List<MessageEntity>)

    @Update
    suspend fun update(message: MessageEntity)

    @Query("UPDATE messages SET isDeleted = 1, updatedAt = :updatedAt WHERE id = :id")
    suspend fun softDelete(id: String, updatedAt: String)

    @Query("SELECT * FROM messages WHERE isSynced = 0")
    suspend fun getUnsyncedMessages(): List<MessageEntity>

    @Query("UPDATE messages SET isSynced = 1 WHERE id = :id")
    suspend fun markSynced(id: String)
}
