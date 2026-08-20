package com.coupleos.app.data.local.dao

import androidx.room.*
import com.coupleos.app.data.local.entity.MoodEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface MoodDao {
    @Query("SELECT * FROM moods WHERE userId = :userId ORDER BY date DESC")
    fun getMoodsByUser(userId: String): Flow<List<MoodEntity>>

    @Query("SELECT * FROM moods WHERE userId = :userId AND date = :date LIMIT 1")
    suspend fun getMoodByDate(userId: String, date: String): MoodEntity?

    @Query("SELECT * FROM moods WHERE date = :date")
    suspend fun getAllMoodsByDate(date: String): List<MoodEntity>

    @Query("SELECT * FROM moods WHERE userId = :userId ORDER BY date DESC LIMIT :limit")
    fun getRecentMoods(userId: String, limit: Int = 7): Flow<List<MoodEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(mood: MoodEntity)

    @Update
    suspend fun update(mood: MoodEntity)

    @Delete
    suspend fun delete(mood: MoodEntity)

    @Query("SELECT * FROM moods WHERE isSynced = 0")
    suspend fun getUnsyncedMoods(): List<MoodEntity>

    @Query("UPDATE moods SET isSynced = 1 WHERE id = :id")
    suspend fun markSynced(id: String)
}
