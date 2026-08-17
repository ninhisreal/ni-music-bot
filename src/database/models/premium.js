import { getDb } from '../db.js';

/** Check if user has active premium. */
export function isUserPremium(userId) {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM premium_users WHERE user_id = ? AND expires_at > unixepoch()'
  ).get(userId);
  return !!row;
}

/** Check if guild has active premium. */
export function isGuildPremium(guildId) {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM premium_guilds WHERE guild_id = ? AND expires_at > unixepoch()'
  ).get(guildId);
  return !!row;
}

/** Check if a user OR their guild has premium. */
export function hasPremium(userId, guildId) {
  return isUserPremium(userId) || isGuildPremium(guildId);
}

/** Grant premium to a user. durationDays defaults to 30. */
export function grantUserPremium(userId, activatedBy, durationDays = 30) {
  const db = getDb();
  const expiresAt = Math.floor(Date.now() / 1000) + durationDays * 86400;
  db.prepare(
    `INSERT OR REPLACE INTO premium_users (user_id, tier, expires_at, activated_by)
     VALUES (?, 1, ?, ?)`
  ).run(userId, expiresAt, activatedBy);
}

/** Grant premium to a guild. */
export function grantGuildPremium(guildId, activatedBy, durationDays = 30) {
  const db = getDb();
  const expiresAt = Math.floor(Date.now() / 1000) + durationDays * 86400;
  db.prepare(
    `INSERT OR REPLACE INTO premium_guilds (guild_id, tier, expires_at, activated_by)
     VALUES (?, 1, ?, ?)`
  ).run(guildId, expiresAt, activatedBy);
}

/** Revoke user premium. */
export function revokeUserPremium(userId) {
  const db = getDb();
  db.prepare('DELETE FROM premium_users WHERE user_id = ?').run(userId);
}

/** Revoke guild premium. */
export function revokeGuildPremium(guildId) {
  const db = getDb();
  db.prepare('DELETE FROM premium_guilds WHERE guild_id = ?').run(guildId);
}

/** Get premium info for a user. */
export function getPremiumInfo(userId) {
  const db = getDb();
  return db.prepare('SELECT * FROM premium_users WHERE user_id = ?').get(userId);
}
