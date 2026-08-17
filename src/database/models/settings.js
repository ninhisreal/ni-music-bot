import { getDb } from '../db.js';
import { LIMITS } from '../../utils/constants.js';

const DEFAULTS = {
  prefix:           'ni!',
  language:         'vi',
  volume:           LIMITS.VOLUME_DEFAULT,
  auto_dj_enabled:  0,
};

/** Get settings for a guild (creates row with defaults if not exists). */
export function getSettings(guildId) {
  const db = getDb();
  let row = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
  if (!row) {
    db.prepare(
      `INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)`
    ).run(guildId);
    row = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
  }
  return { ...DEFAULTS, ...row };
}

/** Update a single setting for a guild. */
export function setSetting(guildId, key, value) {
  const db = getDb();
  // Ensure row exists
  db.prepare('INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)').run(guildId);
  db.prepare(
    `UPDATE guild_settings SET ${key} = ?, updated_at = unixepoch() WHERE guild_id = ?`
  ).run(value, guildId);
}

/** Set DJ role for a guild. Pass null to clear. */
export function setDjRole(guildId, roleId) {
  return setSetting(guildId, 'dj_role_id', roleId);
}

/** Set locked voice channel. Pass null to unlock. */
export function setLockedChannel(guildId, channelId) {
  return setSetting(guildId, 'locked_channel_id', channelId);
}

/** Set bot language for a guild. */
export function setLanguage(guildId, lang) {
  return setSetting(guildId, 'language', lang);
}

/** Set default volume. */
export function setVolume(guildId, volume) {
  return setSetting(guildId, 'volume', volume);
}

/** Enable/disable Auto-DJ. */
export function setAutoDJ(guildId, enabled) {
  return setSetting(guildId, 'auto_dj_enabled', enabled ? 1 : 0);
}
