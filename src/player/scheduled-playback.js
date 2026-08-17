import { getDb } from '../database/db.js';
import { getPlayer } from './setup.js';
import { getPlaylistTracks } from '../database/models/playlist.js';
import { logger } from '../utils/logger.js';

const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute
let intervalId = null;

/**
 * Start the scheduled playback checker (runs every minute).
 * Called once at bot startup.
 * @param {import('discord.js').Client} client
 */
export function startScheduler(client) {
  if (intervalId) return; // Already running

  intervalId = setInterval(() => checkSchedules(client), CHECK_INTERVAL_MS);
  logger.info('Scheduler', 'Scheduled playback checker started');
}

/** Stop the scheduler. */
export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/**
 * Check all enabled schedules and trigger playback if the current time matches.
 */
async function checkSchedules(client) {
  const db = getDb();
  const schedules = db.prepare(
    'SELECT * FROM scheduled_playback WHERE enabled = 1'
  ).all();

  if (!schedules.length) return;

  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  for (const sched of schedules) {
    if (sched.cron_time !== hhmm) continue;

    logger.info('Scheduler', `Triggering schedule for guild ${sched.guild_id} at ${hhmm}`);
    await triggerSchedule(client, sched);
  }
}

async function triggerSchedule(client, sched) {
  try {
    const guild = client.guilds.cache.get(sched.guild_id);
    if (!guild) return;

    const textChannel = guild.channels.cache.get(sched.channel_id);
    const vcChannel = sched.vc_channel_id
      ? guild.channels.cache.get(sched.vc_channel_id)
      : guild.channels.cache.find(c => c.type === 2 && c.members.size > 0); // Find occupied VC

    if (!vcChannel) return;

    const tracks = getPlaylistTracks(sched.playlist_id);
    if (!tracks.length) return;

    const player = getPlayer();
    const queue = player.nodes.create(guild, {
      metadata: { channel: textChannel },
      selfDeaf: true,
      volume: 80,
    });

    if (!queue.connection) {
      await queue.connect(vcChannel);
    }

    for (const track of tracks) {
      const res = await player.search(track.url || track.title, { requestedBy: { id: sched.created_by, tag: 'Scheduler' } });
      if (res.hasTracks()) queue.addTrack(res.tracks[0]);
    }

    if (!queue.isPlaying()) await queue.node.play();

    if (textChannel) {
      textChannel.send(`⏰ **Lịch phát nhạc đã kích hoạt!** Đang phát playlist lúc ${sched.cron_time}`).catch(() => {});
    }
  } catch (err) {
    logger.error('Scheduler', `Failed to trigger schedule: ${err.message}`);
  }
}

/** Save a schedule to DB. */
export function setSchedule(guildId, playlistId, time, channelId, vcChannelId, createdBy) {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO scheduled_playback
     (guild_id, playlist_id, cron_time, channel_id, vc_channel_id, enabled, created_by)
     VALUES (?, ?, ?, ?, ?, 1, ?)`
  ).run(guildId, playlistId, time, channelId, vcChannelId || null, createdBy);
}

/** Clear a guild's schedule. */
export function clearSchedule(guildId) {
  const db = getDb();
  db.prepare('DELETE FROM scheduled_playback WHERE guild_id = ?').run(guildId);
}

/** Get a guild's current schedule. */
export function getSchedule(guildId) {
  const db = getDb();
  return db.prepare('SELECT * FROM scheduled_playback WHERE guild_id = ?').get(guildId);
}
