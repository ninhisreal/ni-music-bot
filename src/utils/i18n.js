import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load locale files at startup
const LOCALES = {
  vi: JSON.parse(readFileSync(join(__dirname, '../../locales/vi.json'), 'utf8')),
  en: JSON.parse(readFileSync(join(__dirname, '../../locales/en.json'), 'utf8')),
};

const DEFAULT_LANG = process.env.DEFAULT_LANGUAGE || 'vi';

/**
 * Get translation string for a dot-path key.
 * @param {string} lang - 'vi' | 'en'
 * @param {string} key  - e.g. 'music.play_added'
 * @param {object} vars - placeholder values, e.g. { title: 'Song' }
 * @returns {string}
 */
export function t(lang, key, vars = {}) {
  const locale = LOCALES[lang] || LOCALES[DEFAULT_LANG];
  const parts = key.split('.');
  let str = locale;
  for (const part of parts) {
    str = str?.[part];
    if (str === undefined) break;
  }
  // Fallback to default lang if key missing
  if (str === undefined) {
    let fallback = LOCALES[DEFAULT_LANG];
    for (const part of parts) fallback = fallback?.[part];
    str = fallback ?? key;
  }
  // Replace {{placeholder}} tokens
  return String(str).replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

/**
 * Get the bot language for a guild from settings.
 * Pass `db` (database instance) and `guildId`.
 */
export function getLang(db, guildId) {
  if (!db || !guildId) return DEFAULT_LANG;
  try {
    const row = db.prepare('SELECT language FROM guild_settings WHERE guild_id = ?').get(guildId);
    return (row?.language && LOCALES[row.language]) ? row.language : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}
