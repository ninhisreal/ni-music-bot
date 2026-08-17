import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { listFilters } from '../player/filters.js';

/**
 * Build a select menu to choose audio filters.
 */
export function buildFilterSelectRow(activeFilter = null) {
  const filters = listFilters();

  const select = new StringSelectMenuBuilder()
    .setCustomId('select_filter')
    .setPlaceholder('🎛️ Chọn Audio Filter...');

  select.addOptions(
    new StringSelectMenuOptionBuilder()
      .setLabel('Tắt tất cả filters (Mặc định)')
      .setValue('none')
      .setEmoji('❌')
      .setDefault(activeFilter === 'none' || !activeFilter)
  );

  for (const f of filters) {
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(f.name)
        .setValue(f.key)
        .setEmoji(f.emoji)
        .setDefault(activeFilter === f.key)
    );
  }

  return new ActionRowBuilder().addComponents(select);
}
