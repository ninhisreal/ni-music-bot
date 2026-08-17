import { SlashCommandBuilder } from 'discord.js';
import { getHistory } from '../../database/models/stats.js';
import { baseEmbed } from '../../embeds/builder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('Xem lịch sử 20 bài hát gần nhất đã phát trên server này'),
  aliases: ['recent'],

  async execute(interaction) {
    const history = getHistory(interaction.guild.id, 20);

    if (!history.length) {
      return interaction.reply({
        content: '❌ Chưa có bài hát nào được phát trên server này gần đây!',
        ephemeral: true,
      });
    }

    const list = history.map((h, i) => {
      const author = h.artist ? ` — ${h.artist}` : '';
      return `\`${i + 1}.\` [${h.track_title.slice(0, 55)}](${h.url})${author} (Yêu cầu bởi <@${h.requested_by}>)`;
    }).join('\n');

    const embed = baseEmbed({
      title: `📜 Lịch Sử Phát Nhạc — ${interaction.guild.name}`,
      description: list,
      footer: 'Hiển thị tối đa 20 bài gần nhất • 🎵 Ni Music Bot',
    });

    return interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    const history = getHistory(message.guild.id, 20);

    if (!history.length) {
      return message.reply('❌ Chưa có bài hát nào được phát trên server này gần đây!');
    }

    const list = history.map((h, i) => {
      const author = h.artist ? ` — ${h.artist}` : '';
      return `\`${i + 1}.\` [${h.track_title.slice(0, 55)}](${h.url})${author} (Yêu cầu bởi <@${h.requested_by}>)`;
    }).join('\n');

    const embed = baseEmbed({
      title: `📜 Lịch Sử Phát Nhạc — ${message.guild.name}`,
      description: list,
      footer: 'Hiển thị tối đa 20 bài gần nhất • 🎵 Ni Music Bot',
    });

    return message.reply({ embeds: [embed] });
  },
};
