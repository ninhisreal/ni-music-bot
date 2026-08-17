import { SlashCommandBuilder } from 'discord.js';
import { getPlaylists, getPlaylistByName, getPlaylistTracks } from '../../database/models/playlist.js';
import { buildPlaylistEmbed } from '../../embeds/misc-embeds.js';
import { baseEmbed } from '../../embeds/builder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('playlist-list')
    .setDescription('Xem danh sách các playlist của bạn hoặc chi tiết một playlist cụ thể')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Tên playlist cụ thể muốn xem chi tiết (để trống để xem tất cả)')
    ),
  aliases: ['pl-list', 'pllist', 'playlists'],

  async execute(interaction) {
    const specificName = interaction.options.getString('name');
    const userId = interaction.user.id;

    if (specificName) {
      const pl = getPlaylistByName(userId, specificName);
      if (!pl) return interaction.reply({ content: `❌ Không tìm thấy playlist tên **${specificName}**!`, ephemeral: true });
      const tracks = getPlaylistTracks(pl.id);
      const embed = buildPlaylistEmbed(pl, tracks);
      return interaction.reply({ embeds: [embed] });
    }

    const playlists = getPlaylists(userId);
    if (!playlists.length) {
      return interaction.reply({
        content: '❌ Bạn chưa có playlist nào! Dùng `/playlist-save <tên>` khi đang phát nhạc để tạo playlist.',
        ephemeral: true,
      });
    }

    const list = playlists.map((p, i) =>
      `\`${i + 1}.\` **${p.name}** — 🎵 ${p.track_count || 0} bài`
    ).join('\n');

    const embed = baseEmbed({
      title: `📋 Danh sách Playlist của ${interaction.user.username}`,
      description: list,
      footer: 'Dùng /playlist-load <tên> để phát • 🎵 Ni Music Bot',
    });

    return interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const specificName = args.join(' ').trim();
    const userId = message.author.id;

    if (specificName) {
      const pl = getPlaylistByName(userId, specificName);
      if (!pl) return message.reply(`❌ Không tìm thấy playlist tên **${specificName}**!`);
      const tracks = getPlaylistTracks(pl.id);
      const embed = buildPlaylistEmbed(pl, tracks);
      return message.reply({ embeds: [embed] });
    }

    const playlists = getPlaylists(userId);
    if (!playlists.length) {
      return message.reply('❌ Bạn chưa có playlist nào! Dùng `ni!plsave <tên>` khi đang phát nhạc để tạo playlist.');
    }

    const list = playlists.map((p, i) =>
      `\`${i + 1}.\` **${p.name}** — 🎵 ${p.track_count || 0} bài`
    ).join('\n');

    const embed = baseEmbed({
      title: `📋 Danh sách Playlist của ${message.author.username}`,
      description: list,
      footer: 'Dùng ni!plload <tên> để phát • 🎵 Ni Music Bot',
    });

    return message.reply({ embeds: [embed] });
  },
};
