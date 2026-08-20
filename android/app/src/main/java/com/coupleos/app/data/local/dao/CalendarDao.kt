package com.coupleos.app.data.local.dao

import androidx.room.*
import com.coupleos.app.data.local.entity.CalendarEventEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CalendarDao {
    @Query("SELECT * FROM calendar_events WHERE deletedAt IS NULL ORDER BY date ASC")
    fun getAllEvents(): Flow<List<CalendarEventEntity>>

    @Query("SELECT * FROM calendar_events WHERE date >= :startDate AND date <= :endDate AND deletedAt IS NULL ORDER BY date ASC")
    fun getEventsBetween(startDate: String, endDate: String): Flow<List<CalendarEventEntity>>

    @Query("SELECT * FROM calendar_events WHERE date = :date AND deletedAt IS NULL ORDER BY date ASC")
    fun getEventsByDate(date: String): Flow<List<CalendarEventEntity>>

    @Query("SELECT * FROM calendar_events WHERE date >= :today AND deletedAt IS NULL ORDER BY date ASC LIMIT 1")
    suspend fun getNextEvent(today: String): CalendarEventEntity?

    @Query("SELECT * FROM calendar_events WHERE id = :id AND deletedAt IS NULL")
    suspend fun getEventById(id: String): CalendarEventEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(event: CalendarEventEntity)

    @Update
    suspend fun update(event: CalendarEventEntity)

    @Query("UPDATE calendar_events SET deletedAt = :deletedAt WHERE id = :id")
    suspend fun softDelete(id: String, deletedAt: String)

    @Query("SELECT * FROM calendar_events WHERE isSynced = 0 AND deletedAt IS NULL")
    suspend fun getUnsyncedEvents(): List<CalendarEventEntity>

    @Query("UPDATE calendar_events SET isSynced = 1 WHERE id = :id")
    suspend fun markSynced(id: String)
}
