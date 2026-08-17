import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Build queue pagination navigation buttons:
 * [◀️ Trang trước] [Trang X/Y] [▶️ Trang sau] [🔀 Xáo trộn]
 */
export function buildQueueNavRow(currentPage, totalPages) {
  const prevBtn = new ButtonBuilder()
    .setCustomId(`queue_page_${currentPage - 1}`)
    .setLabel('◀️ Trước')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(currentPage <= 0);

  const pageIndicator = new ButtonBuilder()
    .setCustomId('queue_indicator')
    .setLabel(`${currentPage + 1}/${totalPages}`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const nextBtn = new ButtonBuilder()
    .setCustomId(`queue_page_${currentPage + 1}`)
    .setLabel('Sau ▶️')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(currentPage >= totalPages - 1);

  const shuffleBtn = new ButtonBuilder()
    .setCustomId('player_shuffle')
    .setLabel('🔀 Xáo trộn')
    .setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder().addComponents(prevBtn, pageIndicator, nextBtn, shuffleBtn);
}
