package com.coupleos.app

import android.content.Context
import android.util.Log
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter

/**
 * Captures any uncaught exception on the main thread and writes a full stack trace
 * to logcat (tag "CoupleOSCrash") and to files/crash_log.txt so a launch crash can
 * be diagnosed even without a debugger attached.
 */
object CrashLogger {

    private const val TAG = "CoupleOSCrash"
    private const val FILE_NAME = "crash_log.txt"

    fun install(context: Context) {
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            try {
                val sw = StringWriter()
                throwable.printStackTrace(PrintWriter(sw))
                val stack = sw.toString()

                Log.e(TAG, "Uncaught exception on thread ${thread.name}", throwable)

                try {
                    val file = File(context.filesDir, FILE_NAME)
                    val previous = if (file.length() > 256 * 1024) "" else runCatching { file.readText() }.getOrDefault("")
                    file.writeText(previous + "\n\n--- ${System.currentTimeMillis()} ---\n$stack")
                } catch (t: Throwable) {
                    Log.w(TAG, "Could not persist crash log", t)
                }
            } catch (_: Throwable) {
                // Never let the crash handler itself crash.
            } finally {
                defaultHandler?.uncaughtException(thread, throwable)
            }
        }
    }
}
