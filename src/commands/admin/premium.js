import { SlashCommandBuilder } from 'discord.js';
import { isUserPremium, isGuildPremium, grantUserPremium, grantGuildPremium, revokeUserPremium, revokeGuildPremium } from '../../database/models/premium.js';
import { config } from '../../config.js';
import { baseEmbed } from '../../embeds/builder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription('Xem thông tin Premium hoặc cấp Premium (chỉ Bot Owner)')
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Kiểm tra trạng thái Premium của bạn và server này')
    )
    .addSubcommand(sub =>
      sub.setName('grant-user')
        .setDescription('Cấp quyền Premium cho một User (chỉ Bot Owner)')
        .addUserOption(opt => opt.setName('user').setDescription('User cần cấp').setRequired(true))
        .addIntegerOption(opt => opt.setName('days').setDescription('Số ngày (mặc định 30)').setMinValue(1))
    )
    .addSubcommand(sub =>
      sub.setName('grant-guild')
        .setDescription('Cấp quyền Premium cho một Server (chỉ Bot Owner)')
        .addStringOption(opt => opt.setName('guild_id').setDescription('ID Server cần cấp').setRequired(true))
        .addIntegerOption(opt => opt.setName('days').setDescription('Số ngày (mặc định 30)').setMinValue(1))
    ),
  aliases: [],

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    if (sub === 'status') {
      const uPrem = isUserPremium(userId);
      const gPrem = isGuildPremium(guildId);

      const embed = baseEmbed({
        title: '⭐ Trạng Thái Premium',
        description:
          `👤 **Tài khoản của bạn:** ${uPrem ? '✅ Đang hoạt động (Premium User)' : '❌ Miễn phí'}\n` +
          `🏰 **Server này:** ${gPrem ? '✅ Đang hoạt động (Premium Server)' : '❌ Miễn phí'}\n\n` +
          `**Các đặc quyền Premium:**\n` +
          `• 🤖 Auto-DJ tự động phát bài hát tương tự khi hết queue\n` +
          `• ⏰ Lên lịch phát nhạc tự động mỗi ngày\n` +
          `• 🏷️ Hệ thống gắn tag tâm trạng & thể loại không giới hạn\n` +
          `• 💾 Lưu trữ tới 200 playlist cá nhân & mã code vĩnh viễn\n` +
          `• ⏳ Giảm thời gian chờ cooldown lệnh còn 1s`,
      });

      return interaction.reply({ embeds: [embed] });
    }

    // Owner checks for grant subcommands
    if (config.ownerId && userId !== config.ownerId) {
      return interaction.reply({ content: '❌ Chỉ Bot Owner mới có quyền cấp Premium!', ephemeral: true });
    }

    if (sub === 'grant-user') {
      const target = interaction.options.getUser('user');
      const days = interaction.options.getInteger('days') || 30;
      grantUserPremium(target.id, userId, days);
      return interaction.reply(`✅ Đã cấp **${days}** ngày Premium cho user <@${target.id}>!`);
    }

    if (sub === 'grant-guild') {
      const targetGuildId = interaction.options.getString('guild_id');
      const days = interaction.options.getInteger('days') || 30;
      grantGuildPremium(targetGuildId, userId, days);
      return interaction.reply(`✅ Đã cấp **${days}** ngày Premium cho Guild ID \`${targetGuildId}\`!`);
    }
  },

  async executePrefix(message, args) {
    const userId = message.author.id;
    const guildId = message.guild.id;
    const action = args[0]?.toLowerCase();

    if (action === 'grant' && config.ownerId && userId === config.ownerId) {
      const target = message.mentions.users.first();
      const days = parseInt(args[2], 10) || 30;
      if (!target) return message.reply('❌ Cú pháp: `ni!premium grant @user <số ngày>`');
      grantUserPremium(target.id, userId, days);
      return message.reply(`✅ Đã cấp **${days}** ngày Premium cho user <@${target.id}>!`);
    }

    const uPrem = isUserPremium(userId);
    const gPrem = isGuildPremium(guildId);

    const embed = baseEmbed({
      title: '⭐ Trạng Thái Premium',
      description:
        `👤 **Tài khoản của bạn:** ${uPrem ? '✅ Đang hoạt động' : '❌ Miễn phí'}\n` +
        `🏰 **Server này:** ${gPrem ? '✅ Đang hoạt động' : '❌ Miễn phí'}\n\n` +
        `**Đặc quyền:** Auto-DJ, Lên lịch phát nhạc, 200 Playlists, Song Tags, Cooldown 1s...`,
    });

    return message.reply({ embeds: [embed] });
  },
};
