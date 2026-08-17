import { getDb } from '../db.js';
import { LIMITS } from '../../utils/constants.js';

/** Record a played track to listening_stats and play_history. */
export function recordPlay(guildId, userId, track) {
  const db = getDb();

  // Listening stats (per-user)
  db.prepare(
    `INSERT INTO listening_stats (user_id, guild_id, track_title, artist, source, duration_listened)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(userId, guildId, track.title, track.author || null, track.source || 'yt', track.duration || 0);

  // Play history (per-guild) — keep only last N entries
  db.prepare(
    `INSERT INTO play_history (guild_id, track_title, url, artist, requested_by)
     VALUES (?, ?, ?, ?, ?)`
  ).run(guildId, track.title, track.url, track.author || null, userId);

  // Trim history to max size
  db.prepare(
    `DELETE FROM play_history WHERE guild_id = ? AND id NOT IN (
      SELECT id FROM play_history WHERE guild_id = ? ORDER BY played_at DESC LIMIT ?
    )`
  ).run(guildId, guildId, LIMITS.HISTORY_MAX);
}

/** Get listening stats for a user. */
export function getUserStats(userId, guildId) {
  const db = getDb();

  const totalTime = db.prepare(
    `SELECT COALESCE(SUM(duration_listened), 0) as total
     FROM listening_stats WHERE user_id = ? AND guild_id = ?`
  ).get(userId, guildId)?.total ?? 0;

  const totalTracks = db.prepare(
    `SELECT COUNT(*) as count FROM listening_stats WHERE user_id = ? AND guild_id = ?`
  ).get(userId, guildId)?.count ?? 0;

  const topTracks = db.prepare(
    `SELECT track_title, artist, COUNT(*) as plays
     FROM listening_stats WHERE user_id = ? AND guild_id = ?
     GROUP BY track_title ORDER BY plays DESC LIMIT 5`
  ).all(userId, guildId);

  const topArtists = db.prepare(
    `SELECT artist, COUNT(*) as plays
     FROM listening_stats WHERE user_id = ? AND guild_id = ? AND artist IS NOT NULL
     GROUP BY artist ORDER BY plays DESC LIMIT 5`
  ).all(userId, guildId);

  const topPlatform = db.prepare(
    `SELECT source, COUNT(*) as count
     FROM listening_stats WHERE user_id = ? AND guild_id = ?
     GROUP BY source ORDER BY count DESC LIMIT 1`
  ).get(userId, guildId);

  return { totalTime, totalTracks, topTracks, topArtists, topPlatform };
}

/** Get play history for a guild (most recent first). */
export function getHistory(guildId, limit = LIMITS.HISTORY_MAX) {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM play_history WHERE guild_id = ? ORDER BY played_at DESC LIMIT ?`
  ).all(guildId, limit);
}

/** Get recent history for Auto-DJ analysis. */
export function getRecentHistory(guildId, limit = 10) {
  const db = getDb();
  return db.prepare(
    `SELECT track_title, artist FROM play_history WHERE guild_id = ?
     ORDER BY played_at DESC LIMIT ?`
  ).all(guildId, limit);
}
