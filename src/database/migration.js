import { existsSync, readFileSync } from 'node:fs';
import { logger } from '../utils/logger.js';

const SCHEMA = `
-- Guild Settings
CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY,
  prefix TEXT DEFAULT 'ni!',
  dj_role_id TEXT DEFAULT NULL,
  text_channel_id TEXT DEFAULT NULL,
  voice_channel_id TEXT DEFAULT NULL,
  language TEXT DEFAULT 'vi',
  volume INTEGER DEFAULT 80,
  auto_dj_enabled INTEGER DEFAULT 0,
  locked_channel_id TEXT DEFAULT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Playlists
CREATE TABLE IF NOT EXISTS playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  guild_id TEXT DEFAULT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  is_public INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Playlist Tracks
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT DEFAULT 'yt',
  duration INTEGER DEFAULT 0,
  artist TEXT DEFAULT NULL,
  position INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

-- Playlist Share Codes
CREATE TABLE IF NOT EXISTS playlist_codes (
  code TEXT PRIMARY KEY,
  playlist_id INTEGER DEFAULT NULL,
  creator_id TEXT DEFAULT NULL,
  created_by TEXT DEFAULT NULL,
  track_count INTEGER DEFAULT 0,
  is_premium INTEGER DEFAULT 0,
  data TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER DEFAULT NULL
);

-- Premium Users
CREATE TABLE IF NOT EXISTS premium_users (
  user_id TEXT PRIMARY KEY,
  tier INTEGER DEFAULT 1,
  expires_at INTEGER DEFAULT NULL,
  activated_by TEXT DEFAULT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Premium Guilds
CREATE TABLE IF NOT EXISTS premium_guilds (
  guild_id TEXT PRIMARY KEY,
  tier INTEGER DEFAULT 1,
  expires_at INTEGER DEFAULT NULL,
  activated_by TEXT DEFAULT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Listening Stats
CREATE TABLE IF NOT EXISTS listening_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  track_title TEXT NOT NULL,
  artist TEXT DEFAULT NULL,
  source TEXT DEFAULT 'yt',
  duration_listened INTEGER DEFAULT 0,
  played_at INTEGER DEFAULT (unixepoch())
);

-- Play History
CREATE TABLE IF NOT EXISTS play_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  track_title TEXT NOT NULL,
  url TEXT NOT NULL,
  artist TEXT DEFAULT NULL,
  requested_by TEXT DEFAULT NULL,
  played_at INTEGER DEFAULT (unixepoch())
);

-- Song Tags
CREATE TABLE IF NOT EXISTS song_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  track_url TEXT NOT NULL,
  track_title TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE (user_id, track_url, tag)
);

-- Scheduled Playback
CREATE TABLE IF NOT EXISTS scheduled_playback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  playlist_id INTEGER NOT NULL,
  cron_time TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  vc_channel_id TEXT DEFAULT NULL,
  enabled INTEGER DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE (guild_id, playlist_id, cron_time)
);

-- Allowed Guilds
CREATE TABLE IF NOT EXISTS allowed_guilds (
  guild_id TEXT PRIMARY KEY,
  guild_name TEXT DEFAULT NULL,
  added_by TEXT DEFAULT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_pid ON playlist_tracks(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_play_history_guild ON play_history(guild_id, played_at);
CREATE INDEX IF NOT EXISTS idx_listening_stats_user ON listening_stats(user_id, played_at);
CREATE INDEX IF NOT EXISTS idx_song_tags_user ON song_tags(user_id, tag);
`;

/**
 * Apply database migrations and import legacy JSON data if available.
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {string} [jsonLegacyPath]
 */
export function applyMigrations(db, jsonLegacyPath = null) {
  // 1. Configure pragmas
  db.exec('PRAGMA foreign_keys = ON;');
  try {
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA synchronous = NORMAL;');
  } catch {}

  // 2. Run DDL schema
  db.exec(SCHEMA);

  // 3. Migrate from legacy JSON file if exists and database is fresh
  if (jsonLegacyPath && existsSync(jsonLegacyPath)) {
    try {
      const countRow = db.prepare('SELECT COUNT(*) as count FROM guild_settings').get();
      if (countRow && countRow.count === 0) {
        const raw = readFileSync(jsonLegacyPath, 'utf8');
        const legacyData = JSON.parse(raw);

        if (Array.isArray(legacyData.guild_settings)) {
          const insertSetting = db.prepare(`
            INSERT OR IGNORE INTO guild_settings (guild_id, prefix, dj_role_id, text_channel_id, voice_channel_id, language, volume, auto_dj_enabled, locked_channel_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const s of legacyData.guild_settings) {
            insertSetting.run(
              s.guild_id,
              s.prefix || 'ni!',
              s.dj_role_id || null,
              s.text_channel_id || null,
              s.voice_channel_id || null,
              s.language || 'vi',
              s.volume || 80,
              s.auto_dj_enabled ? 1 : 0,
              s.locked_channel_id || null
            );
          }
        }

        if (Array.isArray(legacyData.allowed_guilds)) {
          const insertGuild = db.prepare(`
            INSERT OR IGNORE INTO allowed_guilds (guild_id, guild_name, added_by)
            VALUES (?, ?, ?)
          `);
          for (const g of legacyData.allowed_guilds) {
            insertGuild.run(g.guild_id, g.guild_name || null, g.added_by || null);
          }
        }

        logger.info('DB', `Migrated legacy data from ${jsonLegacyPath} to SQLite.`);
      }
    } catch (err) {
      logger.warn('DB', `Legacy JSON migration notice: ${err.message}`);
    }
  }
}
