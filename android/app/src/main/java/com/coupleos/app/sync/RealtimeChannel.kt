package com.coupleos.app.sync

import com.coupleos.app.data.repository.GitHubRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Real-time channel over the two GitHub gists.
 *
 * There is no always-on server in this app: the source of truth is each person's
 * private gist. To still get a live, chat-like experience we keep a fast polling
 * loop running while a screen is open:
 *
 *  - every [ACTIVE_INTERVAL_MS] we re-read the partner's file (read-only) and my own,
 *  - if the payload changed since the last tick we emit it, so the UI updates instantly,
 *  - when nothing changes for a while we back off to [IDLE_INTERVAL_MS] to save battery
 *    and stay well inside GitHub's rate limits,
 *  - any screen can call [subscribe] / [unsubscribe]; the loop only runs while at least
 *    one subscriber is listening.
 *
 * The ownership rules are unchanged: this class only READS. Writes still go through
 * GitHubRepository.saveFullList / saveObject onto MY token only.
 */
@Singleton
class RealtimeChannel @Inject constructor(
    private val repo: GitHubRepository,
) {
    companion object {
        /** Poll interval while the conversation is moving. */
        const val ACTIVE_INTERVAL_MS = 3_000L

        /** Poll interval after a stretch with no changes. */
        const val IDLE_INTERVAL_MS = 12_000L

        /** How many idle ticks before we back off. */
        private const val IDLE_TICKS_BEFORE_BACKOFF = 5
    }

    data class Snapshot(
        val fileName: String,
        /** Merged JSON (my data + partner data). */
        val json: String,
        val fromPartnerChanged: Boolean,
        val at: Long = System.currentTimeMillis(),
    )

    /** Live connection indicator for the UI ("متصل / در حال اتصال"). */
    private val _live = MutableStateFlow(false)
    val live: StateFlow<Boolean> = _live

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val flows = mutableMapOf<String, MutableStateFlow<Snapshot?>>()
    private val jobs = mutableMapOf<String, Job>()
    private val subscribers = mutableMapOf<String, Int>()

    /**
     * Stream of live updates for one gist file (e.g. messages.json, extras.json).
     */
    fun stream(fileName: String): StateFlow<Snapshot?> = synchronized(this) {
        flows.getOrPut(fileName) { MutableStateFlow(null) }
    }

    /** Start (or join) the live loop for a file. Call from a screen's onStart. */
    fun subscribe(fileName: String) {
        synchronized(this) {
            subscribers[fileName] = (subscribers[fileName] ?: 0) + 1
            if (jobs[fileName]?.isActive == true) return
            jobs[fileName] = scope.launch { loop(fileName) }
        }
    }

    /** Leave the live loop. When the last subscriber leaves, polling stops. */
    fun unsubscribe(fileName: String) {
        synchronized(this) {
            val next = (subscribers[fileName] ?: 1) - 1
            if (next <= 0) {
                subscribers.remove(fileName)
                jobs.remove(fileName)?.cancel()
                if (subscribers.isEmpty()) _live.value = false
            } else {
                subscribers[fileName] = next
            }
        }
    }

    /** Force an immediate refresh (e.g. right after the user sent a message). */
    fun poke(fileName: String) {
        scope.launch { tick(fileName, force = true) }
    }

    private suspend fun loop(fileName: String) {
        var idleTicks = 0
        while (scope.isActive) {
            val changed = tick(fileName, force = false)
            idleTicks = if (changed) 0 else idleTicks + 1
            val interval =
                if (idleTicks >= IDLE_TICKS_BEFORE_BACKOFF) IDLE_INTERVAL_MS else ACTIVE_INTERVAL_MS
            delay(interval)
        }
    }

    private val lastPartnerPayload = mutableMapOf<String, String>()
    private val lastMerged = mutableMapOf<String, String>()

    private suspend fun tick(fileName: String, force: Boolean): Boolean {
        return try {
            val partner = repo.readPartnerContent(fileName).getOrNull()
            val merged = repo.readMergedContent(fileName).getOrNull() ?: return false

            val partnerChanged = partner != null && lastPartnerPayload[fileName] != partner
            val mergedChanged = lastMerged[fileName] != merged

            if (partner != null) lastPartnerPayload[fileName] = partner
            lastMerged[fileName] = merged
            _live.value = true

            if (mergedChanged || force) {
                stream(fileName).value = Snapshot(fileName, merged, partnerChanged)
                true
            } else {
                false
            }
        } catch (_: Exception) {
            _live.value = false
            false
        }
    }
}
