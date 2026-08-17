import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import {
  createPlaylist,
  getPlaylistByName,
  addTracks,
  getPlaylists,
} from '../../database/models/playlist.js';
import { isUserPremium, isGuildPremium } from '../../database/models/premium.js';
import { LIMITS } from '../../utils/constants.js';

export default {
  data: new SlashCommandBuilder()
    .setName('playlist-save')
    .setDescription('Lưu toàn bộ hàng đợi bài hát hiện tại thành một playlist cá nhân')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Tên cho playlist mới')
        .setRequired(true)
    ),
  aliases: ['pl-save', 'plsave'],

  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    const tracks = [];
    if (queue?.currentTrack) tracks.push(queue.currentTrack);
    if (queue?.tracks?.size) tracks.push(...queue.tracks.toArray());

    if (!tracks.length) {
      return interaction.reply({ content: '❌ Không có bài hát nào trong hàng đợi để lưu!', ephemeral: true });
    }

    const name = interaction.options.getString('name').trim();
    const userId = interaction.user.id;
    const isPrem = isUserPremium(userId) || isGuildPremium(interaction.guild.id);

    const userPlaylists = getPlaylists(userId);
    const maxPlaylists = isPrem ? LIMITS.PLAYLIST_MAX_PREMIUM : LIMITS.PLAYLIST_MAX_FREE;

    if (userPlaylists.length >= maxPlaylists) {
      return interaction.reply({
        content: `❌ Bạn đã đạt giới hạn tối đa **${maxPlaylists}** playlist! Hãy xóa bớt hoặc nâng cấp Premium.`,
        ephemeral: true,
      });
    }

    const existing = getPlaylistByName(userId, name);
    if (existing) {
      return interaction.reply({
        content: `❌ Bạn đã có playlist tên **${name}** rồi! Vui lòng chọn tên khác.`,
        ephemeral: true,
      });
    }

    const playlistId = createPlaylist(userId, interaction.guild.id, name);
    const tracksToSave = tracks.slice(0, LIMITS.TRACKS_PER_PLAYLIST).map(t => ({
      title: t.title,
      url: t.url,
      source: t.raw?.source || 'yt',
      duration: Math.floor((t.durationMS || 0) / 1000),
      author: t.author,
    }));

    addTracks(playlistId, tracksToSave);

    return interaction.reply(`✅ Đã lưu playlist **${name}** thành công với **${tracksToSave.length}** bài hát!`);
  },

  async executePrefix(message, args) {
    if (!args.length) {
      return message.reply('❌ Vui lòng nhập tên cho playlist! Ví dụ: `ni!plsave MyFavorites`');
    }

    const queue = useQueue(message.guild.id);
    const tracks = [];
    if (queue?.currentTrack) tracks.push(queue.currentTrack);
    if (queue?.tracks?.size) tracks.push(...queue.tracks.toArray());

    if (!tracks.length) {
      return message.reply('❌ Không có bài hát nào trong hàng đợi để lưu!');
    }

    const name = args.join(' ').trim();
    const userId = message.author.id;
    const isPrem = isUserPremium(userId) || isGuildPremium(message.guild.id);

    const userPlaylists = getPlaylists(userId);
    const maxPlaylists = isPrem ? LIMITS.PLAYLIST_MAX_PREMIUM : LIMITS.PLAYLIST_MAX_FREE;

    if (userPlaylists.length >= maxPlaylists) {
      return message.reply(`❌ Bạn đã đạt giới hạn tối đa **${maxPlaylists}** playlist!`);
    }

    const existing = getPlaylistByName(userId, name);
    if (existing) {
      return message.reply(`❌ Bạn đã có playlist tên **${name}** rồi! Vui lòng chọn tên khác.`);
    }

    const playlistId = createPlaylist(userId, message.guild.id, name);
    const tracksToSave = tracks.slice(0, LIMITS.TRACKS_PER_PLAYLIST).map(t => ({
      title: t.title,
      url: t.url,
      source: t.raw?.source || 'yt',
      duration: Math.floor((t.durationMS || 0) / 1000),
      author: t.author,
    }));

    addTracks(playlistId, tracksToSave);

    return message.reply(`✅ Đã lưu playlist **${name}** thành công với **${tracksToSave.length}** bài hát!`);
  },
};
