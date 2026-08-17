import { EmbedBuilder } from 'discord.js';
import { formatDuration } from '../utils/duration.js';
import { COLORS, LIMITS } from '../utils/constants.js';

/**
 * Build a paginated queue embed.
 *
 * @param {import('discord-player').GuildQueue} queue
 * @param {number} page - 0-indexed page number
 * @returns {{ embed: EmbedBuilder, totalPages: number }}
 */
export function buildQueueEmbed(queue, page = 0) {
  const tracks = queue.tracks.toArray();
  const current = queue.currentTrack;

  const pageSize = LIMITS.QUEUE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(tracks.length / pageSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * pageSize;
  const pageTracks = tracks.slice(start, start + pageSize);

  // Total queue duration
  const totalMs = tracks.reduce((acc, t) => acc + (t.durationMS || 0), 0);

  let description = '';

  // Show currently playing
  if (current) {
    description += `**▶️ Đang phát:**\n[${current.title}](${current.url}) — \`${current.duration}\` | 👤 ${current.author}\n\n`;
  }

  if (tracks.length === 0) {
    description += '*Hàng đợi trống*';
  } else {
    description += `**📋 Hàng đợi — ${tracks.length} bài:**\n`;
    pageTracks.forEach((t, i) => {
      const num = start + i + 1;
      const truncTitle = t.title.length > 50 ? t.title.slice(0, 47) + '...' : t.title;
      description += `\`${num}.\` [${truncTitle}](${t.url}) — \`${t.duration}\`\n`;
    });
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('📋 Hàng đợi')
    .setDescription(description)
    .setFooter({ text: `Trang ${safePage + 1}/${totalPages} • Tổng: ${formatDuration(totalMs)} • ${tracks.length} bài` })
    .setTimestamp();

  return { embed, totalPages, currentPage: safePage };
}
