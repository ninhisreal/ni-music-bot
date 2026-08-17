/**
 * Global constants: emojis, colors, limits used throughout the bot.
 */

// ─── Platform Colors ───────────────────────────────────────────────────
export const COLORS = {
  youtube:    0xFF0000,
  spotify:    0x1DB954,
  applemusic: 0xFC3C44,
  soundcloud: 0xFF5500,
  deezer:     0xA238FF,
  default:    0x5865F2, // Discord blurple
  success:    0x57F287,
  error:      0xED4245,
  warning:    0xFEE75C,
  info:       0x5865F2,
};

// ─── Platform display names & source detection ─────────────────────────
export const SOURCES = {
  youtube:    { name: 'YouTube Music', emoji: '▶️', color: COLORS.youtube },
  spotify:    { name: 'Spotify',       emoji: '🟢', color: COLORS.spotify },
  applemusic: { name: 'Apple Music',   emoji: '🎵', color: COLORS.applemusic },
  soundcloud: { name: 'SoundCloud',    emoji: '🟠', color: COLORS.soundcloud },
  deezer:     { name: 'Deezer',        emoji: '🟣', color: COLORS.deezer },
  unknown:    { name: 'Unknown',       emoji: '🎶', color: COLORS.default },
};

// ─── Emojis ────────────────────────────────────────────────────────────
export const EMOJI = {
  // Playback controls
  PREV:      '⏮️',
  PLAY:      '▶️',
  PAUSE:     '⏸️',
  SKIP:      '⏭️',
  STOP:      '⏹️',
  LOOP:      '🔁',
  SHUFFLE:   '🔀',
  VOL_DOWN:  '🔉',
  VOL_UP:    '🔊',

  // Features
  QUEUE:     '📋',
  SAVE:      '❤️',
  LYRICS:    '🎵',
  FILTERS:   '🎛️',
  ADD_LIST:  '📥',
  EXPORT:    '📤',
  ARTIST:    '🎙️',
  STATS:     '📊',
  HISTORY:   '📜',

  // Status
  SUCCESS:   '✅',
  ERROR:     '❌',
  WARNING:   '⚠️',
  LOADING:   '⏳',
  MUSIC:     '🎶',
  BOT:       '🤖',
  SLEEP:     '💤',
  LOCK:      '🔒',
  GLOBE:     '🌐',
  CLOCK:     '⏰',
  TAG:       '🏷️',
  VOTE:      '👥',

  // Numbers 1-10
  NUMS: ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'],
};

// ─── Limits ────────────────────────────────────────────────────────────
export const LIMITS = {
  QUEUE_PAGE_SIZE:     10,   // tracks per queue page
  HISTORY_MAX:         50,   // max history entries stored per guild
  SEARCH_RESULTS:      10,   // search results shown
  PLAYLIST_MAX_FREE:   50,   // max playlists per user (free)
  PLAYLIST_MAX_PREMIUM: 200, // max playlists per user (premium)
  TRACKS_PER_PLAYLIST: 500,  // max tracks per playlist
  CODE_EXPIRY_DAYS_FREE:    30,   // playlist code expiry (free tier)
  CODE_EXPIRY_DAYS_PREMIUM: 3650, // playlist code expiry (premium — ~10yr)
  AUTO_LEAVE_MS:       120000, // 2 minutes idle before disconnect
  COOLDOWN_MS:         3000,   // 3s between commands (free)
  COOLDOWN_PREMIUM_MS: 1000,  // 1s between commands (premium)
  VOLUME_DEFAULT:      80,
  VOLUME_MIN:          0,
  VOLUME_MAX:          200,
  ARTIST_CACHE_TTL_MS: 86400000, // 24h artist info cache
};

// ─── Loop modes ────────────────────────────────────────────────────────
export const LOOP_MODE = {
  NONE:  0,
  TRACK: 1,
  QUEUE: 2,
};

export const LOOP_LABELS = {
  [LOOP_MODE.NONE]:  'Tắt',
  [LOOP_MODE.TRACK]: 'Bài hát',
  [LOOP_MODE.QUEUE]: 'Queue',
};
