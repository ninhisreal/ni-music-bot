import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';

/**
 * Build a select menu of user's playlists to add the current track to.
 * @param {Array<{id: number, name: string, track_count: number}>} playlists
 */
export function buildPlaylistSelectRow(playlists) {
  const select = new StringSelectMenuBuilder()
    .setCustomId('select_add_to_playlist')
    .setPlaceholder('📥 Chọn playlist để thêm bài hát...');

  playlists.slice(0, 25).forEach((p) => {
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(p.name)
        .setDescription(`🎵 Đang có ${p.track_count || 0} bài`)
        .setValue(String(p.id))
    );
  });

  return new ActionRowBuilder().addComponents(select);
}
