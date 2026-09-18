import { GuildQueueEvent } from 'discord-player';
import { getPlayer } from './setup.js';
import { runAutoDJ } from './auto-dj.js';
import { clearSleepTimer } from './sleep-timer.js';
import { recordPlay } from '../database/models/stats.js';
import { buildNowPlayingEmbed } from '../embeds/now-playing.js';
import {
  buildPlayerControlsRow,
  buildPlayerControlsRow2,
  buildPlayerControlsRow3,
} from '../buttons/player-controls.js';
import { logger } from '../utils/logger.js';
import { LIMITS } from '../utils/constants.js';

/** Maps guildId → the current "Now Playing" Discord message */
const nowPlayingMessages = new Map();
/** Maps guildId → live progress update interval ID */
const npUpdateIntervals = new Map();

export function getNowPlayingMessage(guildId) {
  return nowPlayingMessages.get(guildId);
}
export function setNowPlayingMessage(guildId, msg) {
  nowPlayingMessages.set(guildId, msg);
}

/**
 * Clear the live progress update interval for a guild.
 */
function clearNpInterval(guildId) {
  const interval = npUpdateIntervals.get(guildId);
  if (interval) {
    clearInterval(interval);
    npUpdateIntervals.delete(guildId);
  }
}

/**
 * Delete the old Now Playing message silently (garbage collection).
 */
async function deleteOldNpMessage(guildId) {
  const existing = nowPlayingMessages.get(guildId);
  if (existing) {
    try { await existing.delete(); } catch {}
    nowPlayingMessages.delete(guildId);
  }
}

// ─── Memory Management ──────────────────────────────────────────────────

/**
 * Force V8 Garbage Collection if exposed via --expose-gc flag.
 * Safe no-op if GC is not exposed.
 */
function forceGC() {
  if (typeof global.gc === 'function') {
    try { global.gc(); } catch {}
  }
}

/**
 * Memory Watchdog — Monitors heap usage and forces GC when nearing limits.
 * Runs every 60 seconds. If heap exceeds 180MB, forces aggressive GC.
 */
let _watchdogTimer = null;

export function startMemoryWatchdog() {
  if (_watchdogTimer) return;
  _watchdogTimer = setInterval(() => {
    const mem = process.memoryUsage();
    const heapMB = Math.round(mem.heapUsed / 1048576);
    const rssMB = Math.round(mem.rss / 1048576);

    if (heapMB > 400) {
      logger.warn('Memory', `⚠️ Heap ${heapMB}MB > 400MB threshold — forcing GC`);
      forceGC();
      const after = Math.round(process.memoryUsage().heapUsed / 1048576);
      logger.info('Memory', `GC complete: ${heapMB}MB → ${after}MB`);
    } else {
      logger.debug('Memory', `Heap: ${heapMB}MB | RSS: ${rssMB}MB`);
    }
  }, 60_000);
  if (_watchdogTimer.unref) _watchdogTimer.unref();
}

// ─── Player Events ──────────────────────────────────────────────────────

/**
 * Attach all player event handlers with aggressive memory lifecycle.
 * Called once during bot startup after setupPlayer().
 */
export function setupPlayerEvents() {
  const player = getPlayer();

  // ── Track starts playing ───────────────────────────────────────────
  player.events.on(GuildQueueEvent.playerStart, async (queue, track) => {
    const channel = queue.metadata?.channel;
    if (!channel) {
      logger.warn('Events', 'playerStart: No channel in queue metadata!');
      return;
    }

    const guildId = queue.guild.id;

    // Record to stats (non-blocking)
    try {
      recordPlay(guildId, track.requestedBy?.id || 'unknown', track);
    } catch {}

    // ── Garbage Collection: Delete old Now Playing message ──────────
    clearNpInterval(guildId);
    await deleteOldNpMessage(guildId);

    // Build Now Playing embed + buttons
    try {
      const embed = buildNowPlayingEmbed(track, queue);
      const row1 = buildPlayerControlsRow(queue);
      const row2 = buildPlayerControlsRow2();
      const row3 = buildPlayerControlsRow3();

      const msg = await channel.send({ embeds: [embed], components: [row1, row2, row3] });
      nowPlayingMessages.set(guildId, msg);
      logger.info('Events', `🎵 Now Playing: "${track.title}" in #${channel.name}`);

      // ── Live Progress Bar Update every 15s ───────────────────────
      const updateInterval = setInterval(async () => {
        try {
          const currentMsg = nowPlayingMessages.get(guildId);
          if (!currentMsg || !queue.currentTrack || queue.currentTrack !== track) {
            clearNpInterval(guildId);
            return;
          }
          const updatedEmbed = buildNowPlayingEmbed(track, queue);
          const updatedRow1 = buildPlayerControlsRow(queue);
          await currentMsg.edit({
            embeds: [updatedEmbed],
            components: [updatedRow1, row2, row3],
          }).catch(() => clearNpInterval(guildId));
        } catch {
          clearNpInterval(guildId);
        }
      }, 15_000);

      if (updateInterval.unref) updateInterval.unref();
      npUpdateIntervals.set(guildId, updateInterval);
    } catch (err) {
      logger.error('Events', `NowPlaying embed FAILED: ${err.message}\n${err.stack}`);
      // Fallback: send a simple text message if embed fails
      try {
        const fallback = await channel.send(`🎵 **Đang phát:** ${track.title} — ${track.author || 'Unknown'}`);
        nowPlayingMessages.set(guildId, fallback);
      } catch {}
    }
  });

  // ── Track finishes ─────────────────────────────────────────────────
  player.events.on(GuildQueueEvent.playerFinish, (queue, track) => {
    // Preserve track metadata for repeat mode / history navigation
  });

  // ── Track added to queue ───────────────────────────────────────────
  player.events.on(GuildQueueEvent.audioTrackAdd, async (queue, track) => {
    if (queue.isPlaying()) {
      queue.metadata?.channel?.send(`✅ Đã thêm **${track.title}** vào hàng đợi`).catch(() => {});
    }
  });

  // ── Multiple tracks added ──────────────────────────────────────────
  player.events.on(GuildQueueEvent.audioTracksAdd, async (queue, tracks) => {
    queue.metadata?.channel?.send(`✅ Đã thêm **${tracks.length}** bài vào hàng đợi`).catch(() => {});
  });

  // ── Queue finished ─────────────────────────────────────────────────
  player.events.on(GuildQueueEvent.emptyQueue, async (queue) => {
    const guildId = queue.guild.id;
    clearNpInterval(guildId);
    await deleteOldNpMessage(guildId);

    // Try Auto-DJ before announcing empty
    try {
      await runAutoDJ(queue.guild, queue);
    } catch {}

    if (!queue.isPlaying()) {
      queue.metadata?.channel?.send('🎵 Hết nhạc trong hàng đợi!').catch(() => {});
    }
    forceGC();
  });

  // ── Channel empty → auto-leave ─────────────────────────────────────
  player.events.on(GuildQueueEvent.emptyChannel, (queue) => {
    const guildId = queue.guild.id;
    logger.info('Events', `Channel empty in ${guildId}, leaving in 2min`);
    setTimeout(async () => {
      if (queue.connection && !queue.isPlaying()) {
        queue.delete();
        clearSleepTimer(guildId);
        clearNpInterval(guildId);
        await deleteOldNpMessage(guildId);
        forceGC();
      }
    }, LIMITS.AUTO_LEAVE_MS);
  });

  // ── Player error → Skip + Cleanup ──────────────────────────────────
  player.events.on(GuildQueueEvent.playerError, (queue, error, track) => {
    logger.error('Events', `Player error "${track?.title}": ${error.message}`);
    queue.metadata?.channel?.send(`⚠️ Lỗi phát **${track?.title}** — chuyển bài...`).catch(() => {});
    forceGC();
  });

  // ── Connection error ───────────────────────────────────────────────
  player.events.on(GuildQueueEvent.error, (queue, error) => {
    logger.error('Events', `Queue error ${queue.guild.name}: ${error.message}`);
  });

  // ── Debug ──────────────────────────────────────────────────────────
  player.events.on(GuildQueueEvent.debug, (queue, msg) => {
    logger.debug('Player', msg);
  });

  // ── Root Player Error Listeners ────────────────────────────────────
  player.on('error', (err) => logger.error('PlayerRoot', err?.message || err));
  player.on('playerError', (err) => logger.error('PlayerRoot', err?.message || err));

  logger.info('Events', '⚡ Player events attached with Aggressive Memory Lifecycle');
}
