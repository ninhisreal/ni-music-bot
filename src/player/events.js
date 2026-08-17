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

export function getNowPlayingMessage(guildId) {
  return nowPlayingMessages.get(guildId);
}
export function setNowPlayingMessage(guildId, msg) {
  nowPlayingMessages.set(guildId, msg);
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

    if (heapMB > 180) {
      logger.warn('Memory', `⚠️ Heap ${heapMB}MB > 180MB threshold — forcing GC`);
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
    if (!channel) return;

    const guildId = queue.guild.id;

    // Record to stats (non-blocking)
    try {
      recordPlay(guildId, track.requestedBy?.id || 'unknown', track);
    } catch {}

    // Build Now Playing embed + buttons
    const embed = buildNowPlayingEmbed(track, queue);
    const row1 = buildPlayerControlsRow(queue);
    const row2 = buildPlayerControlsRow2();
    const row3 = buildPlayerControlsRow3();

    try {
      const existing = nowPlayingMessages.get(guildId);
      if (existing?.editable) {
        await existing.edit({ embeds: [embed], components: [row1, row2, row3] }).catch(() => {});
      } else {
        const msg = await channel.send({ embeds: [embed], components: [row1, row2, row3] });
        nowPlayingMessages.set(guildId, msg);
      }
    } catch (err) {
      logger.error('Events', `NowPlaying embed: ${err.message}`);
    }
  });

  // ── Track finishes → Release stream references & GC ────────────────
  player.events.on(GuildQueueEvent.playerFinish, (queue, track) => {
    // Null out heavy references to help GC
    if (track) {
      track.raw = null;
      track.thumbnail = null;
    }
    forceGC();
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
    nowPlayingMessages.delete(guildId);

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
    setTimeout(() => {
      if (queue.connection && !queue.isPlaying()) {
        queue.delete();
        clearSleepTimer(guildId);
        nowPlayingMessages.delete(guildId);
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
