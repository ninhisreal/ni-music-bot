import { SlashCommandBuilder } from 'discord.js';
import { isBotAdmin, lockBot, unlockBot, getLockStatus } from '../../guards/bot-lock.js';
import { addAuthorizedGuild, removeAuthorizedGuild, getAllowedGuilds } from '../../guards/guild-guard.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Khóa bot chế độ riêng tư (Admin Only)'),
  aliases: ['unlock', 'addserver', 'allowserver', 'removeserver', 'listservers'],

  async execute(interaction) {
    if (!isBotAdmin(interaction.user, interaction.guild)) {
      return interaction.reply({
        content: '⛔ Bạn không có quyền sử dụng lệnh quản trị này!',
        ephemeral: true,
      });
    }

    const commandName = interaction.commandName;
    if (commandName === 'unlock') {
      unlockBot(interaction.user);
      return interaction.reply('🔓 **Đã mở khóa Bot!** Tất cả mọi người trong server đều có thể sử dụng lại bình thường.');
    } else {
      lockBot(interaction.user);
      return interaction.reply('🔒 **Đã khóa Bot thành công!** Hiện tại chỉ có duy nhất Admin (**NinhIsReal**) mới có quyền sử dụng Bot.');
    }
  },

  async executePrefix(message, args) {
    if (!isBotAdmin(message.author, message.guild)) {
      return message.reply('⛔ Bạn không có quyền sử dụng lệnh quản trị này!');
    }

    const commandUsed = message.content.slice(3).trim().split(' ')[0]?.toLowerCase();

    // 1. ni!addserver <Server_ID>
    if (commandUsed === 'addserver' || commandUsed === 'allowserver') {
      const targetGuildId = args[0] || message.guild.id;
      addAuthorizedGuild(targetGuildId, '', message.author.id);
      return message.reply(`✅ **Đã thêm máy chủ (ID: \`${targetGuildId}\`) vào danh sách được phép sử dụng Bot!**\nBây giờ bạn có thể mời bot vào server đó mà không bị tự động thoát.`);
    }

    // 2. ni!removeserver <Server_ID>
    if (commandUsed === 'removeserver') {
      if (!args[0]) return message.reply('❌ Vui lòng nhập ID server cần xóa khỏi danh sách!');
      removeAuthorizedGuild(args[0]);
      return message.reply(`🗑️ Đã xóa máy chủ ID: \`${args[0]}\` khỏi danh sách cấp phép!`);
    }

    // 3. ni!listservers
    if (commandUsed === 'listservers') {
      const list = getAllowedGuilds();
      const formatted = list.map((id, i) => `${i + 1}. \`${id}\``).join('\n');
      return message.reply(`📋 **Danh sách các Server được cấp phép (${list.length}):**\n${formatted}`);
    }

    // 4. ni!unlock
    if (commandUsed === 'unlock') {
      unlockBot(message.author);
      return message.reply('🔓 **Đã mở khóa Bot!** Tất cả mọi người trong server đều có thể sử dụng lại bình thường.');
    }

    // 5. ni!lock
    lockBot(message.author);
    return message.reply('🔒 **Đã khóa Bot thành công!** Hiện tại chỉ có duy nhất Admin (**NinhIsReal**) mới có quyền sử dụng Bot.');
  },
};
