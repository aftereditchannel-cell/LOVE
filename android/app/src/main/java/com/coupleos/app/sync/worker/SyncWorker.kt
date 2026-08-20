package com.coupleos.app.sync.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.coupleos.app.data.local.dao.SyncQueueDao
import com.coupleos.app.data.remote.api.CoupleOSApi
import com.coupleos.app.data.remote.dto.SyncChange
import com.coupleos.app.data.remote.dto.SyncPushRequest
import com.coupleos.app.security.keystore.SecureStorage
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.time.LocalDateTime
import java.util.concurrent.TimeUnit

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val syncQueueDao: SyncQueueDao,
    private val api: CoupleOSApi,
    private val secureStorage: SecureStorage,
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        if (!secureStorage.isPaired()) return Result.success()

        return try {
            // Get pending sync items
            val pendingItems = syncQueueDao.getPendingItems()
            if (pendingItems.isEmpty()) return Result.success()

            // Convert to sync changes
            val changes = pendingItems.map { item ->
                SyncChange(
                    table = item.tableName,
                    recordId = item.recordId,
                    operation = item.operation,
                    data = item.payload,
                    version = 1,
                    timestamp = item.createdAt,
                )
            }

            // Push to backend
            val response = api.syncPush(SyncPushRequest(changes))
            if (response.isSuccessful) {
                val pushResponse = response.body()
                pushResponse?.accepted?.forEach { recordId ->
                    val item = pendingItems.find { it.recordId == recordId }
                    if (item != null) {
                        syncQueueDao.markCompleted(item.id)
                    }
                }
                Result.success()
            } else {
                // Mark failed and retry
                pendingItems.forEach { item ->
                    syncQueueDao.markFailed(item.id, LocalDateTime.now().toString())
                }
                Result.retry()
            }
        } catch (e: Exception) {
            // Network error — retry later
            Result.retry()
        }
    }

    companion object {
        const val WORK_NAME = "couple_os_sync"

        fun createPeriodicRequest(): PeriodicWorkRequest {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            return PeriodicWorkRequestBuilder<SyncWorker>(
                15, TimeUnit.MINUTES,
            )
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    1, TimeUnit.MINUTES,
                )
                .build()
        }

        fun createOneTimeRequest(): OneTimeWorkRequest {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            return OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints)
                .build()
        }
    }
}
