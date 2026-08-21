package com.coupleos.app.sync.worker

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.coupleos.app.data.repository.CoupleSyncRepository
import com.coupleos.app.security.keystore.SecureStorage
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.util.concurrent.TimeUnit

/**
 * Periodic background synchronisation with the GitHub Gists.
 * Runs every 15 minutes when the device is online, plus on demand.
 */
@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val coupleSyncRepository: CoupleSyncRepository,
    private val secureStorage: SecureStorage,
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        if (!secureStorage.isPaired()) return Result.success()
        if (!secureStorage.isAutoSyncEnabled()) return Result.success()

        return try {
            val result = coupleSyncRepository.sync()
            Log.d("SyncWorker", "sync -> ${result.ok}: ${result.message}")
            if (result.ok) Result.success() else Result.retry()
        } catch (e: Exception) {
            Log.e("SyncWorker", "sync failed", e)
            Result.retry()
        }
    }

    companion object {
        const val WORK_NAME = "couple_os_sync"
        const val ONE_TIME_WORK_NAME = "couple_os_sync_now"

        private fun constraints() = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        fun createPeriodicRequest(): PeriodicWorkRequest =
            PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(constraints())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
                .build()

        fun createOneTimeRequest(): OneTimeWorkRequest =
            OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints())
                .build()

        /** Registers the recurring job — safe to call on every app start. */
        fun schedule(context: Context) {
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                createPeriodicRequest(),
            )
        }

        fun syncNow(context: Context) {
            WorkManager.getInstance(context).enqueueUniqueWork(
                ONE_TIME_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                createOneTimeRequest(),
            )
        }
    }
}
