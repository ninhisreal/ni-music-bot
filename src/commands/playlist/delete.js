import { SlashCommandBuilder } from 'discord.js';
import { getPlaylistByName, deletePlaylist } from '../../database/models/playlist.js';

export default {
  data: new SlashCommandBuilder()
    .setName('playlist-delete')
    .setDescription('Xóa một playlist cá nhân của bạn')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Tên playlist cần xóa')
        .setRequired(true)
    ),
  aliases: ['pl-delete', 'pldel'],

  async execute(interaction) {
    const name = interaction.options.getString('name').trim();
    const pl = getPlaylistByName(interaction.user.id, name);

    if (!pl) {
      return interaction.reply({
        content: `❌ Không tìm thấy playlist tên **${name}** để xóa!`,
        ephemeral: true,
      });
    }

    deletePlaylist(pl.id);
    return interaction.reply(`🗑️ Đã xóa playlist **${name}** thành công.`);
  },

  async executePrefix(message, args) {
    if (!args.length) {
      return message.reply('❌ Vui lòng nhập tên playlist cần xóa! Ví dụ: `ni!pldel MyFavorites`');
    }

    const name = args.join(' ').trim();
    const pl = getPlaylistByName(message.author.id, name);

    if (!pl) {
      return message.reply(`❌ Không tìm thấy playlist tên **${name}** để xóa!`);
    }

    deletePlaylist(pl.id);
    return message.reply(`🗑️ Đã xóa playlist **${name}** thành công.`);
  },
};
