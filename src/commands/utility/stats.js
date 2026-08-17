import { SlashCommandBuilder } from 'discord.js';
import { getUserStats } from '../../database/models/stats.js';
import { buildStatsEmbed } from '../../embeds/stats-embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Xem thống kê nghe nhạc cá nhân của bạn (tổng thời gian, top bài hát, top ca sĩ)')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('Xem thống kê của người dùng khác (mặc định là chính bạn)')
    ),
  aliases: ['mystats', 'profile'],

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const stats = getUserStats(targetUser.id, interaction.guild.id);

    if (!stats.totalTracks) {
      return interaction.reply({
        content: `❌ **${targetUser.username}** chưa nghe bài nhạc nào trên server này!`,
        ephemeral: true,
      });
    }

    const embed = buildStatsEmbed(stats, targetUser);
    return interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    const targetUser = message.mentions.users.first() || message.author;
    const stats = getUserStats(targetUser.id, message.guild.id);

    if (!stats.totalTracks) {
      return message.reply(`❌ **${targetUser.username}** chưa nghe bài nhạc nào trên server này!`);
    }

    const embed = buildStatsEmbed(stats, targetUser);
    return message.reply({ embeds: [embed] });
  },
};
