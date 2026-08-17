import { logger } from '../utils/logger.js';

/**
 * Sleep Timer manager.
 * Stores one timer per guild. When the timer fires, the bot leaves the voice channel.
 */

/** @type {Map<string, NodeJS.Timeout>} */
const timers = new Map();

/**
 * Set a sleep timer for a guild.
 * @param {string} guildId
 * @param {number} minutes
 * @param {import('discord-player').GuildQueue} queue
 * @param {import('discord.js').TextChannel} channel - to send notification
 */
export function setSleepTimer(guildId, minutes, queue, channel) {
  // Cancel existing timer if any
  clearSleepTimer(guildId);

  const ms = minutes * 60 * 1000;
  const timeout = setTimeout(async () => {
    timers.delete(guildId);
    logger.info('SleepTimer', `Timer fired for guild ${guildId}`);
    try {
      if (channel) {
        await channel.send('💤 **Hẹn giờ đã kích hoạt!** Bot sẽ rời kênh thoại...').catch(() => {});
      }
      if (queue && queue.connection) {
        queue.delete();
      }
    } catch (err) {
      logger.error('SleepTimer', err.message);
    }
  }, ms);

  timers.set(guildId, timeout);
  logger.info('SleepTimer', `Set ${minutes}min timer for guild ${guildId}`);
}

/**
 * Cancel the sleep timer for a guild.
 * @param {string} guildId
 * @returns {boolean} true if a timer was cancelled
 */
export function clearSleepTimer(guildId) {
  const existing = timers.get(guildId);
  if (existing) {
    clearTimeout(existing);
    timers.delete(guildId);
    logger.info('SleepTimer', `Cleared timer for guild ${guildId}`);
    return true;
  }
  return false;
}

/** Check if a sleep timer is active for a guild. */
export function hasSleepTimer(guildId) {
  return timers.has(guildId);
}
