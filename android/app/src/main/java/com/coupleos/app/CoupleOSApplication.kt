package com.coupleos.app

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class CoupleOSApplication : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    override fun onCreate() {
        super.onCreate()
        CrashLogger.install(this)
    }

    override val workManagerConfiguration: Configuration
        get() = try {
            Configuration.Builder()
                .apply {
                    if (::workerFactory.isInitialized) {
                        setWorkerFactory(workerFactory)
                    }
                }
                .setMinimumLoggingLevel(android.util.Log.INFO)
                .build()
        } catch (t: Throwable) {
            // Never let WorkManager configuration crash the app on launch.
            Configuration.Builder()
                .setMinimumLoggingLevel(android.util.Log.INFO)
                .build()
        }
}
