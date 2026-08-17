import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { setDjRole, getSettings } from '../../database/models/settings.js';

export default {
  data: new SlashCommandBuilder()
    .setName('djrole')
    .setDescription('Chỉ định hoặc xóa DJ Role (chỉ người có role này mới được điều khiển bot)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(opt =>
      opt.setName('role')
        .setDescription('Role muốn đặt làm DJ (để trống để xóa DJ Role)')
    ),
  aliases: ['dj'],

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Bạn cần quyền Administrator để chỉnh sửa DJ Role!', ephemeral: true });
    }

    const role = interaction.options.getRole('role');
    const guildId = interaction.guild.id;

    if (!role) {
      setDjRole(guildId, null);
      return interaction.reply('✅ Đã xóa DJ Role. Bây giờ bất kỳ ai cũng có thể dùng lệnh bot.');
    }

    setDjRole(guildId, role.id);
    return interaction.reply(`🎧 Đã đặt DJ Role thành <@&${role.id}>! Chỉ những người có role này hoặc Administrator mới có thể điều khiển nhạc.`);
  },

  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Bạn cần quyền Administrator để chỉnh sửa DJ Role!');
    }

    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
    const guildId = message.guild.id;

    if (!role && args[0]?.toLowerCase() === 'clear') {
      setDjRole(guildId, null);
      return message.reply('✅ Đã xóa DJ Role. Bây giờ bất kỳ ai cũng có thể dùng lệnh bot.');
    }

    if (!role) {
      const current = getSettings(guildId);
      const curText = current.dj_role_id ? `<@&${current.dj_role_id}>` : 'Chưa đặt';
      return message.reply(`🎧 DJ Role hiện tại: ${curText}\nCú pháp: \`ni!djrole @role\` hoặc \`ni!djrole clear\``);
    }

    setDjRole(guildId, role.id);
    return message.reply(`🎧 Đã đặt DJ Role thành <@&${role.id}>!`);
  },
};
