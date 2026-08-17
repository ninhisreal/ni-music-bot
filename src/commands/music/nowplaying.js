import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { buildNowPlayingEmbed } from '../../embeds/now-playing.js';
import {
  buildPlayerControlsRow,
  buildPlayerControlsRow2,
  buildPlayerControlsRow3,
} from '../../buttons/player-controls.js';

export default {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Xem thông tin và bảng điều khiển bài hát đang phát'),
  aliases: ['np'],

  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.isPlaying() || !queue.currentTrack) {
      return interaction.reply({ content: '❌ Hiện không có bài hát nào đang phát!', ephemeral: true });
    }

    const embed = buildNowPlayingEmbed(queue.currentTrack, queue);
    const row1 = buildPlayerControlsRow(queue);
    const row2 = buildPlayerControlsRow2();
    const row3 = buildPlayerControlsRow3();

    return interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
  },

  async executePrefix(message) {
    const queue = useQueue(message.guild.id);
    if (!queue || !queue.isPlaying() || !queue.currentTrack) {
      return message.reply('❌ Hiện không có bài hát nào đang phát!');
    }

    const embed = buildNowPlayingEmbed(queue.currentTrack, queue);
    const row1 = buildPlayerControlsRow(queue);
    const row2 = buildPlayerControlsRow2();
    const row3 = buildPlayerControlsRow3();

    return message.reply({ embeds: [embed], components: [row1, row2, row3] });
  },
};
