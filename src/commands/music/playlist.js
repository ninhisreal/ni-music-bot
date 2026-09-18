import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { useMainPlayer, useQueue } from 'discord-player';
import {
  getPlaylists,
  getPlaylistByName,
  createPlaylist,
  deletePlaylist,
  getPlaylistTracks,
  addTracks,
  exportPlaylistCode,
  importPlaylistCode,
} from '../../database/models/playlist.js';
import { checkVoice, checkBotPerms } from '../../guards/role-check.js';
import { isUserPremium, isGuildPremium } from '../../database/models/premium.js';
import { getSettings } from '../../database/models/settings.js';
import { buildMiniControlsRow } from '../../buttons/player-controls.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('playlist')
    .setDescription('Quản lý và phát playlist nhạc cá nhân hoặc chia sẻ')
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Xem danh sách tất cả playlist của bạn')
    )
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Tạo playlist mới từ các bài hát hiện tại trong hàng đợi')
        .addStringOption(opt =>
          opt.setName('name').setDescription('Tên playlist muốn tạo').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('play')
        .setDescription('Phát toàn bộ bài hát từ playlist của bạn')
        .addStringOption(opt =>
          opt.setName('name').setDescription('Tên playlist').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('Xem chi tiết các bài hát trong playlist')
        .addStringOption(opt =>
          opt.setName('name').setDescription('Tên playlist').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Xóa một playlist của bạn')
        .addStringOption(opt =>
          opt.setName('name').setDescription('Tên playlist').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('share')
        .setDescription('Tạo mã code chia sẻ playlist cho người khác')
        .addStringOption(opt =>
          opt.setName('name').setDescription('Tên playlist').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('import')
        .setDescription('Nhập playlist vào hàng đợi bằng mã code chia sẻ')
        .addStringOption(opt =>
          opt.setName('code').setDescription('Mã code 8 ký tự').setRequired(true)
        )
    ),
  aliases: ['pl'],

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    if (sub === 'list') {
      const playlists = getPlaylists(userId);
      if (!playlists.length) {
        return interaction.reply({ content: '📂 Bạn chưa có playlist nào! Dùng `/playlist create <tên>` để tạo.', ephemeral: true });
      }

      const listStr = playlists.map((p, i) =>
        `\`${i + 1}.\` **${p.name}** — ${p.track_count || 0} bài`
      ).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📂 Danh sách Playlist của bạn (${playlists.length})`)
        .setDescription(listStr)
        .setFooter({ text: 'Dùng /playlist play <tên> để phát' });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'create') {
      const name = interaction.options.getString('name').trim();
      const queue = useQueue(guildId);
      const tracks = queue ? queue.tracks.toArray() : [];
      if (queue?.currentTrack) tracks.unshift(queue.currentTrack);

      if (!tracks.length) {
        return interaction.reply({ content: '❌ Hàng đợi đang trống, không thể tạo playlist từ danh sách phát hiện tại!', ephemeral: true });
      }

      const existing = getPlaylistByName(userId, name);
      if (existing) {
        return interaction.reply({ content: `❌ Playlist **${name}** đã tồn tại! Vui lòng chọn tên khác.`, ephemeral: true });
      }

      const plId = createPlaylist(userId, guildId, name);
      addTracks(plId, tracks);

      return interaction.reply({
        content: `✅ Đã tạo playlist **${name}** với **${tracks.length}** bài hát thành công!`,
        ephemeral: true,
      });
    }

    if (sub === 'view') {
      const name = interaction.options.getString('name').trim();
      const pl = getPlaylistByName(userId, name);
      if (!pl) return interaction.reply({ content: `❌ Không tìm thấy playlist **${name}**!`, ephemeral: true });

      const tracks = getPlaylistTracks(pl.id);
      if (!tracks.length) {
        return interaction.reply({ content: `📂 Playlist **${name}** hiện đang trống.`, ephemeral: true });
      }

      const tracksList = tracks.slice(0, 15).map((t, i) =>
        `\`${i + 1}.\` [${t.title}](${t.url}) — \`${t.duration}s\` | 👤 ${t.artist || 'Unknown'}`
      ).join('\n');

      const extra = tracks.length > 15 ? `\n\n*(Và còn ${tracks.length - 15} bài khác...)*` : '';

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🎵 Playlist: ${pl.name} (${tracks.length} bài)`)
        .setDescription(tracksList + extra)
        .setFooter({ text: 'Dùng /playlist play để thưởng thức' });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'delete') {
      const name = interaction.options.getString('name').trim();
      const pl = getPlaylistByName(userId, name);
      if (!pl) return interaction.reply({ content: `❌ Không tìm thấy playlist **${name}**!`, ephemeral: true });

      deletePlaylist(pl.id);
      return interaction.reply({ content: `🗑️ Đã xóa playlist **${name}** thành công!`, ephemeral: true });
    }

    if (sub === 'share') {
      const name = interaction.options.getString('name').trim();
      const pl = getPlaylistByName(userId, name);
      if (!pl) return interaction.reply({ content: `❌ Không tìm thấy playlist **${name}**!`, ephemeral: true });

      const isPrem = isUserPremium(userId) || isGuildPremium(guildId);
      const code = exportPlaylistCode(pl.id, userId, isPrem);
      if (!code) return interaction.reply({ content: '❌ Playlist trống, không thể tạo mã chia sẻ!', ephemeral: true });

      return interaction.reply({
        content: `📤 **Mã chia sẻ playlist "${pl.name}":**\n\`${code}\`\n\nNgười khác có thể nhập bằng: \`/playlist import code:${code}\``,
        ephemeral: true,
      });
    }

    if (sub === 'import') {
      const code = interaction.options.getString('code').trim().toUpperCase();
      const tracks = importPlaylistCode(code);
      if (!tracks || !tracks.length) {
        return interaction.reply({ content: '❌ Mã code không hợp lệ hoặc đã hết hạn!', ephemeral: true });
      }

      const vCheck = checkVoice(interaction, true);
      if (!vCheck.ok) return interaction.reply({ content: vCheck.reason, ephemeral: true });
      const pCheck = checkBotPerms(vCheck.voiceChannel);
      if (!pCheck.ok) return interaction.reply({ content: pCheck.reason, ephemeral: true });

      await interaction.deferReply();
      const player = useMainPlayer();
      const settings = getSettings(guildId);

      for (const t of tracks) {
        await player.play(vCheck.voiceChannel, t.url || t.title, {
          nodeOptions: { metadata: { channel: interaction.channel }, volume: settings.volume || 80 },
        }).catch(() => {});
      }

      return interaction.editReply(`✅ Đã nhập và thêm **${tracks.length}** bài từ mã code \`${code}\` vào hàng đợi!`);
    }

    if (sub === 'play') {
      const name = interaction.options.getString('name').trim();
      const pl = getPlaylistByName(userId, name);
      if (!pl) return interaction.reply({ content: `❌ Không tìm thấy playlist **${name}**!`, ephemeral: true });

      const tracks = getPlaylistTracks(pl.id);
      if (!tracks.length) return interaction.reply({ content: `❌ Playlist **${name}** đang trống!`, ephemeral: true });

      const vCheck = checkVoice(interaction, true);
      if (!vCheck.ok) return interaction.reply({ content: vCheck.reason, ephemeral: true });
      const pCheck = checkBotPerms(vCheck.voiceChannel);
      if (!pCheck.ok) return interaction.reply({ content: pCheck.reason, ephemeral: true });

      await interaction.deferReply();
      const player = useMainPlayer();
      const settings = getSettings(guildId);

      for (const t of tracks) {
        await player.play(vCheck.voiceChannel, t.url, {
          nodeOptions: { metadata: { channel: interaction.channel }, volume: settings.volume || 80 },
        }).catch(() => {});
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`▶️ Đang phát Playlist: ${pl.name}`)
        .setDescription(`Đã thêm **${tracks.length}** bài hát vào hàng đợi!`)
        .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag || interaction.user.username}` });

      return interaction.editReply({ embeds: [embed], components: [buildMiniControlsRow()] });
    }
  },

  async executePrefix(message, args) {
    const action = args[0]?.toLowerCase() || 'list';
    const name = args.slice(1).join(' ').trim();
    const userId = message.author.id;
    const guildId = message.guild.id;

    if (action === 'list') {
      const playlists = getPlaylists(userId);
      if (!playlists.length) return message.reply('📂 Bạn chưa có playlist nào! Dùng `ni!pl save <tên>` để tạo.');
      const listStr = playlists.map((p, i) => `\`${i + 1}.\` **${p.name}** — ${p.track_count || 0} bài`).join('\n');
      return message.reply(`📂 **Danh sách Playlist:**\n${listStr}`);
    }

    if (action === 'save' || action === 'create') {
      if (!name) return message.reply('❌ Vui lòng nhập tên playlist! VD: `ni!pl save MyFavs`');
      const queue = useQueue(guildId);
      const tracks = queue ? queue.tracks.toArray() : [];
      if (queue?.currentTrack) tracks.unshift(queue.currentTrack);
      if (!tracks.length) return message.reply('❌ Hàng đợi đang trống!');

      const plId = createPlaylist(userId, guildId, name);
      addTracks(plId, tracks);
      return message.reply(`✅ Đã tạo playlist **${name}** với **${tracks.length}** bài hát!`);
    }

    if (action === 'play' || action === 'load') {
      if (!name) return message.reply('❌ Vui lòng nhập tên playlist! VD: `ni!pl play MyFavs`');
      const pl = getPlaylistByName(userId, name);
      if (!pl) return message.reply(`❌ Không tìm thấy playlist **${name}**!`);
      const tracks = getPlaylistTracks(pl.id);
      if (!tracks.length) return message.reply(`❌ Playlist **${name}** đang trống!`);

      const vCheck = checkVoice(message, true);
      if (!vCheck.ok) return message.reply(vCheck.reason);
      const pCheck = checkBotPerms(vCheck.voiceChannel);
      if (!pCheck.ok) return message.reply(pCheck.reason);

      const msg = await message.reply(`⏳ Đang tải playlist **${pl.name}** (${tracks.length} bài)...`);
      const player = useMainPlayer();
      const settings = getSettings(guildId);

      for (const t of tracks) {
        await player.play(vCheck.voiceChannel, t.url, {
          nodeOptions: { metadata: { channel: message.channel }, volume: settings.volume || 80 },
        }).catch(() => {});
      }

      return msg.edit({
        content: `▶️ Đã phát playlist **${pl.name}** (${tracks.length} bài)!`,
        components: [buildMiniControlsRow()],
      });
    }

    if (action === 'view') {
      if (!name) return message.reply('❌ Nhập tên playlist cần xem!');
      const pl = getPlaylistByName(userId, name);
      if (!pl) return message.reply(`❌ Không tìm thấy playlist **${name}**!`);
      const tracks = getPlaylistTracks(pl.id);
      const str = tracks.slice(0, 10).map((t, i) => `\`${i + 1}.\` ${t.title}`).join('\n');
      return message.reply(`🎵 **Playlist ${pl.name}** (${tracks.length} bài):\n${str}`);
    }

    if (action === 'delete') {
      if (!name) return message.reply('❌ Nhập tên playlist muốn xóa!');
      const pl = getPlaylistByName(userId, name);
      if (!pl) return message.reply(`❌ Không tìm thấy playlist **${name}**!`);
      deletePlaylist(pl.id);
      return message.reply(`🗑️ Đã xóa playlist **${name}**!`);
    }

    if (action === 'share') {
      if (!name) return message.reply('❌ Nhập tên playlist muốn chia sẻ!');
      const pl = getPlaylistByName(userId, name);
      if (!pl) return message.reply(`❌ Không tìm thấy playlist **${name}**!`);
      const isPrem = isUserPremium(userId) || isGuildPremium(guildId);
      const code = exportPlaylistCode(pl.id, userId, isPrem);
      return message.reply(`📤 Mã chia sẻ cho **${pl.name}**: \`${code}\``);
    }

    if (action === 'import') {
      const code = name.toUpperCase();
      if (!code) return message.reply('❌ Nhập mã code chia sẻ!');
      const tracks = importPlaylistCode(code);
      if (!tracks) return message.reply('❌ Mã code không tồn tại hoặc đã hết hạn!');

      const vCheck = checkVoice(message, true);
      if (!vCheck.ok) return message.reply(vCheck.reason);
      const pCheck = checkBotPerms(vCheck.voiceChannel);
      if (!pCheck.ok) return message.reply(pCheck.reason);

      const msg = await message.reply(`⏳ Đang nhập **${tracks.length}** bài từ code \`${code}\`...`);
      const player = useMainPlayer();
      const settings = getSettings(guildId);

      for (const t of tracks) {
        await player.play(vCheck.voiceChannel, t.url || t.title, {
          nodeOptions: { metadata: { channel: message.channel }, volume: settings.volume || 80 },
        }).catch(() => {});
      }

      return msg.edit(`✅ Đã nhập thành công **${tracks.length}** bài hát vào hàng đợi!`);
    }

    return message.reply('❓ Lệnh playlist: `ni!pl list`, `ni!pl save <tên>`, `ni!pl play <tên>`, `ni!pl view <tên>`, `ni!pl delete <tên>`, `ni!pl share <tên>`, `ni!pl import <code>`');
  },
};
