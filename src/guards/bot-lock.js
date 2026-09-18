import { config } from '../config.js';

/**
 * Bot Lock State Guard.
 * Controls exclusive admin lock mode (ni!lock / ni!unlock).
 */

let isLocked = false;

/**
 * Check if a user is the authorized bot administrator.
 * @param {import('discord.js').User} user
 * @param {import('discord.js').Guild} [guild]
 */
export function isBotAdmin(user) {
  return Boolean(config.ownerId && user?.id === config.ownerId);
}

/**
 * Check if the bot is currently locked and whether the user is permitted to use it.
 * @param {import('discord.js').User} user
 * @param {import('discord.js').Guild} [guild]
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function checkBotLock(user, guild = null) {
  if (!isLocked) return { allowed: true };
  if (isBotAdmin(user, guild)) return { allowed: true };

  return {
    allowed: false,
    reason: '🔒 **Bot hiện đang ở chế độ Riêng Tư (Khóa)** do Admin (**NinhIsReal**) kích hoạt!',
  };
}

/**
 * Lock the bot for everyone except the administrator.
 * @param {import('discord.js').User} user
 * @returns {boolean}
 */
export function lockBot(user) {
  isLocked = true;
  return true;
}

/**
 * Unlock the bot for all users.
 * @param {import('discord.js').User} user
 * @returns {boolean}
 */
export function unlockBot(user) {
  isLocked = false;
  return true;
}

/**
 * Get current lock status.
 */
export function getLockStatus() {
  return {
    isLocked,
    adminUserId: config.ownerId,
  };
}
