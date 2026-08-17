import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { buildQueueEmbed } from '../../embeds/queue-embed.js';
import { buildQueueNavRow } from '../../buttons/queue-nav.js';

export default {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Xem danh sách hàng đợi các bài hát sắp phát')
    .addIntegerOption(opt =>
      opt.setName('page')
        .setDescription('Trang muốn xem (mặc định trang 1)')
        .setMinValue(1)
    ),
  aliases: ['q'],

  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue || (!queue.isPlaying() && queue.tracks.size === 0)) {
      return interaction.reply({ content: '❌ Hàng đợi hiện đang trống!', ephemeral: true });
    }

    const page = (interaction.options.getInteger('page') || 1) - 1;
    const { embed, totalPages, currentPage } = buildQueueEmbed(queue, page);
    const navRow = buildQueueNavRow(currentPage, totalPages);

    return interaction.reply({ embeds: [embed], components: [navRow] });
  },

  async executePrefix(message, args) {
    const queue = useQueue(message.guild.id);
    if (!queue || (!queue.isPlaying() && queue.tracks.size === 0)) {
      return message.reply('❌ Hàng đợi hiện đang trống!');
    }

    const page = Math.max(0, (parseInt(args[0], 10) || 1) - 1);
    const { embed, totalPages, currentPage } = buildQueueEmbed(queue, page);
    const navRow = buildQueueNavRow(currentPage, totalPages);

    return message.reply({ embeds: [embed], components: [navRow] });
  },
};
