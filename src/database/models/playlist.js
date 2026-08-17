import { getDb } from '../db.js';
import { generateCode, encodePlaylist, decodePlaylist } from '../../utils/playlist-codec.js';
import { LIMITS } from '../../utils/constants.js';

/** Create a new empty playlist. Returns playlist id. */
export function createPlaylist(userId, guildId, name) {
  const db = getDb();
  const row = db.prepare(
    'INSERT INTO playlists (user_id, guild_id, name) VALUES (?, ?, ?)'
  ).run(userId, guildId, name);
  return row.lastInsertRowid;
}

/** Get all playlists for a user. */
export function getPlaylists(userId) {
  const db = getDb();
  return db.prepare(
    `SELECT p.*, COUNT(pt.id) as track_count
     FROM playlists p
     LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
     WHERE p.user_id = ?
     GROUP BY p.id
     ORDER BY p.created_at DESC`
  ).all(userId);
}

/** Get playlist by user + name. */
export function getPlaylistByName(userId, name) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM playlists WHERE user_id = ? AND LOWER(name) = LOWER(?)'
  ).get(userId, name);
}

/** Get playlist by id. */
export function getPlaylistById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
}

/** Get all tracks in a playlist ordered by position. */
export function getPlaylistTracks(playlistId) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC'
  ).all(playlistId);
}

/** Add a track to a playlist. */
export function addTrack(playlistId, track) {
  const db = getDb();
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as m FROM playlist_tracks WHERE playlist_id = ?'
  ).get(playlistId)?.m ?? -1;
  db.prepare(
    `INSERT INTO playlist_tracks (playlist_id, title, url, source, duration, artist, position)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(playlistId, track.title, track.url, track.source || 'yt', track.duration || 0, track.author || null, maxPos + 1);
}

/** Add multiple tracks at once (transaction). */
export function addTracks(playlistId, tracks) {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO playlist_tracks (playlist_id, title, url, source, duration, artist, position)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as m FROM playlist_tracks WHERE playlist_id = ?'
  ).get(playlistId)?.m ?? -1;

  const insertMany = db.transaction((items) => {
    items.forEach((t, i) => {
      insert.run(playlistId, t.title, t.url, t.source || 'yt', t.duration || 0, t.author || null, maxPos + 1 + i);
    });
  });
  insertMany(tracks);
}

/** Remove a track by position (1-indexed for display, 0-indexed internally). */
export function removeTrackAt(playlistId, position1) {
  const db = getDb();
  const track = db.prepare(
    'SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC LIMIT 1 OFFSET ?'
  ).get(playlistId, position1 - 1);
  if (!track) return false;
  db.prepare('DELETE FROM playlist_tracks WHERE id = ?').run(track.id);
  return true;
}

/** Delete an entire playlist and all its tracks. */
export function deletePlaylist(playlistId) {
  const db = getDb();
  db.prepare('DELETE FROM playlists WHERE id = ?').run(playlistId);
}

/**
 * Export a playlist as a shareable 8-char code.
 * Returns the code string.
 */
export function exportPlaylistCode(playlistId, userId, isPremium = false) {
  const db = getDb();
  const tracks = getPlaylistTracks(playlistId);
  if (!tracks.length) return null;

  const code = generateCode();
  const data = encodePlaylist(tracks);
  const expiryDays = isPremium ? LIMITS.CODE_EXPIRY_DAYS_PREMIUM : LIMITS.CODE_EXPIRY_DAYS_FREE;
  const expiresAt = Math.floor(Date.now() / 1000) + expiryDays * 86400;

  db.prepare(
    `INSERT OR REPLACE INTO playlist_codes (code, data, created_by, track_count, expires_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(code, data, userId, tracks.length, expiresAt);

  return code;
}

/**
 * Load playlist tracks from a code.
 * Returns array of track objects, or null if expired/not found.
 */
export function importPlaylistCode(code) {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM playlist_codes WHERE code = ? AND expires_at > unixepoch()'
  ).get(code);
  if (!row) return null;
  return decodePlaylist(row.data);
}
