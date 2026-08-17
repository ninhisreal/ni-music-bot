import { hasPremium } from '../database/models/premium.js';
import { t, getLang } from '../utils/i18n.js';
import { getDb } from '../database/db.js';

/**
 * Check if a user or their guild has premium access.
 *
 * @param {string} userId
 * @param {string} guildId
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkPremium(userId, guildId) {
  const lang = getLang(getDb(), guildId);
  if (hasPremium(userId, guildId)) return { ok: true };
  return {
    ok: false,
    reason: t(lang, 'premium.required'),
  };
}
