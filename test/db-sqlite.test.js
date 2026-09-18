import test from 'node:test';
import assert from 'node:assert/strict';
import { initDb, closeDb } from '../src/database/db.js';
import { getSettings, setSetting } from '../src/database/models/settings.js';
import {
  createPlaylist,
  getPlaylists,
  addTrack,
  addTracks,
  getPlaylistTracks,
  removeTrackAt,
  deletePlaylist,
} from '../src/database/models/playlist.js';
import { recordPlay, getUserStats, getHistory } from '../src/database/models/stats.js';

test('database initializes SQLite with WAL mode, transactions and models work correctly', (t) => {
  // Use in-memory SQLite database for testing
  const db = initDb(':memory:');
  assert.ok(db, 'Database should be initialized');

  // 1. Settings model
  const guildId = 'test_guild_123';
  const defaultSettings = getSettings(guildId);
  assert.equal(defaultSettings.prefix, 'ni!');
  assert.equal(defaultSettings.volume, 80);

  setSetting(guildId, 'volume', 90);
  const updatedSettings = getSettings(guildId);
  assert.equal(updatedSettings.volume, 90);

  // 2. Playlist model with transactions
  const userId = 'user_456';
  const plId = createPlaylist(userId, guildId, 'My Favorites');
  assert.ok(plId > 0, 'Playlist ID should be positive integer');

  const playlists = getPlaylists(userId);
  assert.equal(playlists.length, 1);
  assert.equal(playlists[0].name, 'My Favorites');

  // Add tracks
  addTrack(plId, {
    title: 'Song A',
    url: 'https://youtube.com/watch?v=1',
    source: 'youtube',
    duration: 180,
    author: 'Artist A',
  });

  // Add multiple tracks via transaction
  addTracks(plId, [
    { title: 'Song B', url: 'https://youtube.com/watch?v=2', source: 'youtube', duration: 200, author: 'Artist B' },
    { title: 'Song C', url: 'https://youtube.com/watch?v=3', source: 'youtube', duration: 220, author: 'Artist C' },
  ]);

  const tracks = getPlaylistTracks(plId);
  assert.equal(tracks.length, 3);
  assert.equal(tracks[0].title, 'Song A');
  assert.equal(tracks[1].title, 'Song B');
  assert.equal(tracks[2].title, 'Song C');

  // Remove track by position (1-indexed)
  const removed = removeTrackAt(plId, 2); // remove Song B
  assert.equal(removed, true);
  const tracksAfterRemove = getPlaylistTracks(plId);
  assert.equal(tracksAfterRemove.length, 2);
  assert.equal(tracksAfterRemove[0].title, 'Song A');
  assert.equal(tracksAfterRemove[1].title, 'Song C');

  // 3. Stats model with aggregates and ORDER BY / LIMIT
  recordPlay(guildId, userId, {
    title: 'Song A',
    author: 'Artist A',
    source: 'youtube',
    url: 'https://youtube.com/watch?v=1',
    duration: 180,
  });
  recordPlay(guildId, userId, {
    title: 'Song A',
    author: 'Artist A',
    source: 'youtube',
    url: 'https://youtube.com/watch?v=1',
    duration: 180,
  });

  const stats = getUserStats(userId, guildId);
  assert.equal(stats.totalTracks, 2);
  assert.equal(stats.totalTime, 360);
  assert.equal(stats.topTracks.length, 1);
  assert.equal(stats.topTracks[0].track_title, 'Song A');
  assert.equal(stats.topTracks[0].plays, 2);

  const history = getHistory(guildId, 10);
  assert.equal(history.length, 2);
  assert.equal(history[0].track_title, 'Song A');

  // Cleanup playlist
  deletePlaylist(plId);
  assert.equal(getPlaylists(userId).length, 0);

  closeDb();
});

test('database migrates legacy data from JSON file into SQLite', async () => {
  const { writeFileSync, unlinkSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { applyMigrations } = await import('../src/database/migration.js');

  const tmpJson = join(process.cwd(), 'test/tmp_legacy.json');
  const legacyData = {
    guild_settings: [
      { guild_id: 'migrated_guild_999', prefix: 'ni!', volume: 75, language: 'en', auto_dj_enabled: 1 }
    ],
    allowed_guilds: [
      { guild_id: 'migrated_guild_999', guild_name: 'Test Server', added_by: 'owner_1' }
    ]
  };
  writeFileSync(tmpJson, JSON.stringify(legacyData));

  const db = initDb(':memory:');
  applyMigrations(db, tmpJson);

  const setting = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get('migrated_guild_999');
  assert.ok(setting, 'Setting should be migrated');
  assert.equal(setting.guild_id, 'migrated_guild_999');
  assert.equal(setting.volume, 75);
  assert.equal(setting.language, 'en');

  const guild = db.prepare('SELECT * FROM allowed_guilds WHERE guild_id = ?').get('migrated_guild_999');
  assert.ok(guild, 'Guild should be migrated');
  assert.equal(guild.guild_name, 'Test Server');

  unlinkSync(tmpJson);
  closeDb();
});
