import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Build confirmation buttons: [✅ Xác nhận] [❌ Hủy]
 * @param {string} action - action identifier
 */
export function buildConfirmRow(action) {
  const confirmBtn = new ButtonBuilder()
    .setCustomId(`confirm_${action}`)
    .setLabel('Xác nhận')
    .setStyle(ButtonStyle.Danger);

  const cancelBtn = new ButtonBuilder()
    .setCustomId(`cancel_${action}`)
    .setLabel('Hủy')
    .setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);
}
