import { SlashCommandBuilder } from 'discord.js';
import { getPlaylistByName, exportPlaylistCode } from '../../database/models/playlist.js';
import { isUserPremium, isGuildPremium } from '../../database/models/premium.js';

export default {
  data: new SlashCommandBuilder()
    .setName('playlist-export')
    .setDescription('Xuất playlist của bạn thành một mã code 8 ký tự để chia sẻ')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Tên playlist cần xuất mã')
        .setRequired(true)
    ),
  aliases: ['pl-export', 'plexport'],

  async execute(interaction) {
    const name = interaction.options.getString('name').trim();
    const userId = interaction.user.id;
    const pl = getPlaylistByName(userId, name);

    if (!pl) {
      return interaction.reply({
        content: `❌ Không tìm thấy playlist tên **${name}**!`,
        ephemeral: true,
      });
    }

    const isPrem = isUserPremium(userId) || isGuildPremium(interaction.guild.id);
    const code = exportPlaylistCode(pl.id, userId, isPrem);

    if (!code) {
      return interaction.reply({
        content: `❌ Playlist **${name}** không có bài hát nào để xuất mã!`,
        ephemeral: true,
      });
    }

    return interaction.reply(
      `📤 **Mã code cho playlist "${name}":** \`${code}\`\n\n` +
      `Bất kỳ ai cũng có thể nghe lại playlist này bằng cách dùng lệnh:\n` +
      `\`/playlist-import ${code}\` hoặc \`ni!plimport ${code}\``
    );
  },

  async executePrefix(message, args) {
    if (!args.length) {
      return message.reply('❌ Vui lòng nhập tên playlist cần xuất mã! Ví dụ: `ni!plexport MyFavorites`');
    }

    const name = args.join(' ').trim();
    const userId = message.author.id;
    const pl = getPlaylistByName(userId, name);

    if (!pl) {
      return message.reply(`❌ Không tìm thấy playlist tên **${name}**!`);
    }

    const isPrem = isUserPremium(userId) || isGuildPremium(message.guild.id);
    const code = exportPlaylistCode(pl.id, userId, isPrem);

    if (!code) {
      return message.reply(`❌ Playlist **${name}** không có bài hát nào để xuất mã!`);
    }

    return message.reply(
      `📤 **Mã code cho playlist "${name}":** \`${code}\`\n\n` +
      `Bất kỳ ai cũng có thể nghe lại playlist này bằng cách dùng lệnh:\n` +
      `\`ni!plimport ${code}\``
    );
  },
};
