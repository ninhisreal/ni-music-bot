import { LIMITS } from '../utils/constants.js';
import { hasPremium } from '../database/models/premium.js';

/** @type {Map<string, number>} Maps userId → last command timestamp */
const lastCommand = new Map();

/**
 * Check if a user is within rate limits.
 *
 * @param {string} userId
 * @param {string} guildId
 * @returns {{ ok: boolean, remainingMs?: number }}
 */
export function checkCooldown(userId, guildId) {
  const now = Date.now();
  const last = lastCommand.get(userId) || 0;
  const cooldown = hasPremium(userId, guildId)
    ? LIMITS.COOLDOWN_PREMIUM_MS
    : LIMITS.COOLDOWN_MS;

  const elapsed = now - last;
  if (elapsed < cooldown) {
    return { ok: false, remainingMs: cooldown - elapsed };
  }

  lastCommand.set(userId, now);
  return { ok: true };
}
