import { SlashCommandBuilder } from 'discord.js';
import { useMainPlayer, QueryType } from 'discord-player';
import { checkVoice, checkBotPerms } from '../../guards/role-check.js';
import { getPlaylistByName, getPlaylistTracks } from '../../database/models/playlist.js';
import { getSettings } from '../../database/models/settings.js';

export default {
  data: new SlashCommandBuilder()
    .setName('playlist-load')
    .setDescription('Tải và phát một playlist cá nhân của bạn')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Tên playlist cần tải')
        .setRequired(true)
    ),
  aliases: ['pl-load', 'plload'],

  async execute(interaction) {
    const vCheck = checkVoice(interaction, true);
    if (!vCheck.ok) return interaction.reply({ content: vCheck.reason, ephemeral: true });

    const pCheck = checkBotPerms(vCheck.voiceChannel);
    if (!pCheck.ok) return interaction.reply({ content: pCheck.reason, ephemeral: true });

    await interaction.deferReply();
    const name = interaction.options.getString('name').trim();
    const playlist = getPlaylistByName(interaction.user.id, name);

    if (!playlist) {
      return interaction.editReply(`❌ Không tìm thấy playlist tên **${name}**! Dùng \`/playlist-list\` để xem danh sách.`);
    }

    const tracks = getPlaylistTracks(playlist.id);
    if (!tracks.length) {
      return interaction.editReply(`❌ Playlist **${name}** không có bài hát nào!`);
    }

    const player = useMainPlayer();
    const settings = getSettings(interaction.guild.id);

    const queue = player.nodes.create(interaction.guild, {
      metadata: { channel: interaction.channel },
      selfDeaf: true,
      volume: settings.volume || 80,
      leaveOnEmpty: true,
      leaveOnEmptyCooldown: 120000,
      leaveOnEnd: false,
    });

    if (!queue.connection) await queue.connect(vCheck.voiceChannel);

    // Fast concurrent search in chunks of 5
    const chunkSize = 5;
    for (let i = 0; i < tracks.length; i += chunkSize) {
      const chunk = tracks.slice(i, i + chunkSize);
      const results = await Promise.all(
        chunk.map(t => player.search(t.url || t.title, { requestedBy: interaction.user, searchEngine: QueryType.AUTO }).catch(() => null))
      );
      for (const res of results) {
        if (res?.hasTracks()) queue.addTrack(res.tracks[0]);
      }
    }

    if (!queue.isPlaying()) await queue.node.play();

    return interaction.editReply(`✅ Đã tải playlist **${name}** (**${tracks.length}** bài) vào hàng đợi!`);
  },

  async executePrefix(message, args) {
    if (!args.length) {
      return message.reply('❌ Vui lòng nhập tên playlist! Ví dụ: `ni!plload MyFavorites`');
    }

    const vCheck = checkVoice(message, true);
    if (!vCheck.ok) return message.reply(vCheck.reason);

    const pCheck = checkBotPerms(vCheck.voiceChannel);
    if (!pCheck.ok) return message.reply(pCheck.reason);

    const name = args.join(' ').trim();
    const playlist = getPlaylistByName(message.author.id, name);

    if (!playlist) {
      return message.reply(`❌ Không tìm thấy playlist tên **${name}**! Dùng \`ni!pllist\` để xem danh sách.`);
    }

    const tracks = getPlaylistTracks(playlist.id);
    if (!tracks.length) {
      return message.reply(`❌ Playlist **${name}** không có bài hát nào!`);
    }

    const msg = await message.reply(`⏳ Đang tải playlist **${name}** (${tracks.length} bài)...`);
    const player = useMainPlayer();
    const settings = getSettings(message.guild.id);

    const queue = player.nodes.create(message.guild, {
      metadata: { channel: message.channel },
      selfDeaf: true,
      volume: settings.volume || 80,
      leaveOnEmpty: true,
      leaveOnEmptyCooldown: 120000,
      leaveOnEnd: false,
    });

    if (!queue.connection) await queue.connect(vCheck.voiceChannel);

    // Fast concurrent search in chunks of 5
    const chunkSize = 5;
    for (let i = 0; i < tracks.length; i += chunkSize) {
      const chunk = tracks.slice(i, i + chunkSize);
      const results = await Promise.all(
        chunk.map(t => player.search(t.url || t.title, { requestedBy: message.author, searchEngine: QueryType.AUTO }).catch(() => null))
      );
      for (const res of results) {
        if (res?.hasTracks()) queue.addTrack(res.tracks[0]);
      }
    }

    if (!queue.isPlaying()) await queue.node.play();

    return msg.edit(`✅ Đã tải playlist **${name}** (**${tracks.length}** bài) vào hàng đợi!`);
  },
};
