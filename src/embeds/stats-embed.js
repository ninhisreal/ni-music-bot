import { EmbedBuilder } from 'discord.js';
import { COLORS } from '../utils/constants.js';
import { formatListeningTime } from '../utils/duration.js';

/**
 * Build the listening stats embed for a user.
 *
 * @param {object} stats - from getUserStats()
 * @param {import('discord.js').User} user
 * @returns {EmbedBuilder}
 */
export function buildStatsEmbed(stats, user) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setAuthor({
      name: `📊 Thống kê nghe nhạc — ${user.username}`,
      iconURL: user.displayAvatarURL(),
    })
    .setTimestamp();

  let description = '';
  description += `⏱️ **Tổng thời gian nghe:** ${formatListeningTime(stats.totalTime)}\n`;
  description += `🎵 **Tổng bài đã nghe:** ${stats.totalTracks.toLocaleString()}\n`;

  if (stats.topPlatform?.source) {
    description += `🌐 **Nền tảng hay dùng:** ${stats.topPlatform.source.toUpperCase()}\n`;
  }

  embed.setDescription(description);

  // Top Tracks
  if (stats.topTracks?.length) {
    const list = stats.topTracks
      .map((t, i) => `\`${i + 1}.\` **${t.track_title}**${t.artist ? ` — ${t.artist}` : ''} *(${t.plays} lần)*`)
      .join('\n');
    embed.addFields({ name: '🏆 Top 5 Bài Hát', value: list, inline: false });
  }

  // Top Artists
  if (stats.topArtists?.length) {
    const list = stats.topArtists
      .map((a, i) => `\`${i + 1}.\` **${a.artist}** *(${a.plays} bài)*`)
      .join('\n');
    embed.addFields({ name: '🎤 Top 5 Nghệ Sĩ', value: list, inline: false });
  }

  embed.setFooter({ text: '🎵 Ni Music Bot' });
  return embed;
}
