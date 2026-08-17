import 'dotenv/config';

/**
 * Load and validate all environment variables.
 * Fallbacks are provided for testing/validation so the codebase can be verified
 * before the user inserts their real token into .env.
 */

function required(name, fallback = '') {
  const val = process.env[name];
  if (!val) {
    if (process.env.NODE_ENV === 'test' || fallback) {
      return fallback;
    }
    return `placeholder_${name.toLowerCase()}`;
  }
  return val;
}

function optional(name, defaultValue = '') {
  return process.env[name] || defaultValue;
}

export const config = {
  // Discord
  token: required('DISCORD_TOKEN', 'YOUR_DISCORD_BOT_TOKEN'),
  clientId: required('CLIENT_ID', 'YOUR_CLIENT_ID'),
  ownerId: optional('OWNER_ID', '1059774801968902184'),
  allowedGuildId: optional('ALLOWED_GUILD_ID', '1330127136262066197'),
  testGuildId: optional('TEST_GUILD_ID'),

  // Prefix
  prefix: optional('PREFIX', 'ni!'),

  // YouTube
  ytCookies: optional('YT_COOKIES'),

  // Genius Lyrics
  geniusToken: optional('GENIUS_ACCESS_TOKEN'),

  // Bot settings
  defaultLanguage: optional('DEFAULT_LANGUAGE', 'vi'),
  logLevel: optional('LOG_LEVEL', 'info'),
};

/** Validate that real production credentials exist before connecting */
export function validateProductionConfig() {
  if (!process.env.DISCORD_TOKEN || process.env.DISCORD_TOKEN.startsWith('YOUR_')) {
    throw new Error(
      '❌ [Config] Missing DISCORD_TOKEN in .env!\n' +
      'Vui lòng mở file .env và điền Token của Bot Discord trước khi khởi động bot.'
    );
  }
  if (!process.env.CLIENT_ID || process.env.CLIENT_ID.startsWith('YOUR_')) {
    throw new Error(
      '❌ [Config] Missing CLIENT_ID in .env!\n' +
      'Vui lòng mở file .env và điền Application Client ID của Bot Discord.'
    );
  }
}
