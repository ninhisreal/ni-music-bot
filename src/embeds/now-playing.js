import { EmbedBuilder } from 'discord.js';
import { progressBar } from '../utils/progress-bar.js';
import { formatDuration } from '../utils/duration.js';
import { getSourceColor, getSourceInfo } from './builder.js';
import { LOOP_LABELS } from '../utils/constants.js';

/**
 * Build the "Now Playing" embed shown in the music channel.
 *
 * Example output:
 * ┌─────────────────────────────────────────────┐
 * │ 🎵 Đang phát                                │
 * │ Never Gonna Give You Up                     │
 * │ 👤 Rick Astley  |  ▶️ YouTube Music         │
 * │ ▓▓▓▓▓▓▓░░░░░░  2:15 / 3:33                 │
 * │ 🔊 80% | 🔁 Tắt | 🎛️ Không có              │
 * └─────────────────────────────────────────────┘
 *
 * @param {import('discord-player').Track} track
 * @param {import('discord-player').GuildQueue} queue
 * @returns {EmbedBuilder}
 */
export function buildNowPlayingEmbed(track, queue) {
  const src    = getSourceInfo(track.url);
  const color  = getSourceColor(track.url);
  const volume = queue.node.volume;
  const loop   = LOOP_LABELS[queue.repeatMode] || 'Tắt';

  // Progress bar (only meaningful if duration known)
  const duration    = track.durationMS || 0;
  const position    = queue.node.playbackTime || 0;
  const bar         = progressBar(position, duration, 16);
  const timeStr     = duration
    ? `${formatDuration(position)} / ${formatDuration(duration)}`
    : '🔴 LIVE';

  // Active filter
  const filterName = queue.filters?.ffmpeg?.filters?.join(', ') || 'Không có';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: '🎵 Đang phát' })
    .setTitle(track.title.slice(0, 256))
    .setURL(track.url)
    .setThumbnail(track.thumbnail || null)
    .setDescription(
      `**${src.emoji} ${src.name}** | 👤 **${track.author || 'Unknown'}**\n\n` +
      `\`${bar}\` ${timeStr}\n\n` +
      `🔊 **${volume}%** • 🔁 **${loop}** • 🎛️ **${filterName}**`
    )
    .setFooter({
      text: `Được yêu cầu bởi ${track.requestedBy?.tag || track.requestedBy?.username || 'Ai đó'}`,
      iconURL: track.requestedBy?.displayAvatarURL?.() || undefined,
    })
    .setTimestamp();

  return embed;
}
