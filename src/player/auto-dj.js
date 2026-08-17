import { getPlayer } from './setup.js';
import { getRecentHistory } from '../database/models/stats.js';
import { getSettings } from '../database/models/settings.js';
import { logger } from '../utils/logger.js';

/**
 * Auto-DJ: when the queue empties, automatically search for and add a similar track.
 * Uses play history to find the top artist, then searches "[artist] mix" on YouTube Music.
 *
 * Only activates if auto_dj_enabled is set in guild settings.
 *
 * @param {import('discord.js').Guild} guild
 * @param {import('discord-player').GuildQueue} queue
 */
export async function runAutoDJ(guild, queue) {
  const settings = getSettings(guild.id);
  if (!settings.auto_dj_enabled) return;

  try {
    const history = getRecentHistory(guild.id, 10);
    if (!history.length) return;

    // Find the most common artist in recent history
    const artistCounts = {};
    for (const h of history) {
      if (h.artist) artistCounts[h.artist] = (artistCounts[h.artist] || 0) + 1;
    }
    const topArtist = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const lastSong = history[0]?.track_title;

    // Build search query — "artist mix" is effective for finding similar tracks
    const query = topArtist
      ? `${topArtist} mix playlist`
      : `${lastSong} similar songs`;

    logger.info('AutoDJ', `Searching: "${query}"`);

    const player = getPlayer();
    const result = await player.search(query, { requestedBy: queue.metadata?.channel });
    if (!result.hasTracks()) return;

    // Pick a random track from first 5 results (avoid always picking #1)
    const candidates = result.tracks.slice(0, 5);
    const picked = candidates[Math.floor(Math.random() * candidates.length)];

    // Avoid re-adding a track that's in recent history
    const historyTitles = new Set(history.map(h => h.track_title?.toLowerCase()));
    const safe = candidates.find(t => !historyTitles.has(t.title?.toLowerCase())) || picked;

    queue.addTrack(safe);
    if (!queue.isPlaying()) {
      await queue.node.play().catch(() => {});
    }

    // Notify in text channel
    const channel = queue.metadata?.channel;
    if (channel) {
      channel.send(`🤖 **Auto-DJ** đã thêm: **${safe.title}**`).catch(() => {});
    }
  } catch (err) {
    logger.error('AutoDJ', 'Error during Auto-DJ:', err.message);
  }
}
