import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { config } from '../config.js';
import { getDb } from '../database/db.js';
import { logger } from '../utils/logger.js';

// Dynamic allowed guilds cache
let dynamicAllowedGuilds = new Set();

/**
 * Load allowed guilds from database and config.
 */
export function getAllowedGuilds() {
  const allowed = new Set();

  // 1. Load from config / .env (comma-separated support)
  if (config.allowedGuildId) {
    const list = String(config.allowedGuildId).split(',').map(s => s.trim()).filter(Boolean);
    list.forEach(id => allowed.add(id));
  }

  // 2. Load from database if table exists
  try {
    const db = getDb();
    const rows = db.prepare('SELECT guild_id FROM allowed_guilds').all();
    rows.forEach(r => allowed.add(r.guild_id));
  } catch {}

  dynamicAllowedGuilds.forEach(id => allowed.add(id));
  return Array.from(allowed);
}

/**
 * Check if a guild is authorized.
 * Strictly verifies against allowed guild list.
 *
 * @param {import('discord.js').Guild | string} guild
 * @returns {boolean}
 */
export function isAuthorizedGuild(guild) {
  if (!guild) return false;
  const guildId = typeof guild === 'string' ? guild : guild.id;
  const allowed = getAllowedGuilds();
  if (allowed.length === 0) return true;
  return allowed.includes(guildId);
}

/**
 * Add a new guild to the authorized list (Admin only).
 * @param {string} guildId
 * @param {string} [guildName]
 * @param {string} [addedBy]
 */
export function addAuthorizedGuild(guildId, guildName = '', addedBy = '') {
  if (!guildId) return false;
  dynamicAllowedGuilds.add(guildId);

  try {
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO allowed_guilds (guild_id, guild_name, added_by, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(guildId, guildName, addedBy);
    return true;
  } catch (err) {
    logger.error('GuildGuard', `Error saving allowed guild to DB: ${err.message}`);
    return true;
  }
}

/**
 * Remove a guild from the authorized list.
 * @param {string} guildId
 */
export function removeAuthorizedGuild(guildId) {
  dynamicAllowedGuilds.delete(guildId);
  try {
    const db = getDb();
    db.prepare('DELETE FROM allowed_guilds WHERE guild_id = ?').run(guildId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear all dynamic allowed guilds.
 */
export function clearAllAuthorizedGuilds() {
  dynamicAllowedGuilds.clear();
  try {
    const db = getDb();
    db.prepare('DELETE FROM allowed_guilds').run();
  } catch {}
}

/**
 * Handle unauthorized server access: Send security warning and immediately leave the guild.
 * @param {import('discord.js').Guild} guild
 */
export async function handleUnauthorizedGuild(guild) {
  if (!guild) return;

  // Check if actually unauthorized
  if (isAuthorizedGuild(guild)) return;

  logger.warn('GuildGuard', `🚨 Unauthorized server detected: "${guild.name}" (ID: ${guild.id}, Owner: ${guild.ownerId}). Initiating auto-leave.`);

  try {
    let targetChannel = guild.systemChannel;

    if (!targetChannel || !targetChannel.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages)) {
      targetChannel = guild.channels.cache.find(
        c => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages)
      );
    }

    if (targetChannel) {
      await targetChannel.send({
        content: [
          '⚠️ **CẢNH BÁO BẢO MẬT & BẢN QUYỀN BOT** ⚠️',
          '',
          '❌ Máy chủ này **không được cấp phép** sử dụng **Ni Music Bot**!',
          '🛡️ Bot này là phiên bản độc quyền thuộc quyền sở hữu của Admin **NinhIsReal** và chỉ được chỉ định hoạt động trên các server được cấp quyền.',
          '',
          '🚪 *Bot sẽ tự động hủy kết nối và rời khỏi máy chủ này sau 3 giây...*',
        ].join('\n'),
      }).catch(() => {});
    }

    await new Promise(resolve => setTimeout(resolve, 3000));
    await guild.leave();
    logger.info('GuildGuard', `✅ Successfully left unauthorized guild: "${guild.name}" (${guild.id})`);
  } catch (err) {
    logger.error('GuildGuard', `Failed to cleanly leave guild ${guild.id}: ${err.message}`);
    await guild.leave().catch(() => {});
  }
}
