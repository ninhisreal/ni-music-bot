import { SlashCommandBuilder } from 'discord.js';
import { useQueue, useMainPlayer, QueryType } from 'discord-player';
import { addTag, removeTag, getTracksByTag, getTrackTags, getPopularTags } from '../../database/models/tags.js';
import { checkVoice, checkBotPerms } from '../../guards/role-check.js';
import { getSettings } from '../../database/models/settings.js';
import { baseEmbed } from '../../embeds/builder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('tag')
    .setDescription('Quản lý gắn thẻ (mood, thể loại) cho bài hát và tìm kiếm theo thẻ')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Gắn tag cho bài hát đang phát')
        .addStringOption(opt =>
          opt.setName('tag_name')
            .setDescription('Tên tag (ví dụ: chill, gaming, sad, edm)')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('play')
        .setDescription('Phát tất cả các bài hát bạn đã gắn tag này')
        .addStringOption(opt =>
          opt.setName('tag_name')
            .setDescription('Tên tag cần phát')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Xem các tag phổ biến của bạn hoặc bài hát theo tag')
        .addStringOption(opt =>
          opt.setName('tag_name')
            .setDescription('Tên tag cần xem bài hát (để trống để xem tất cả tag)')
        )
    ),
  aliases: ['tags'],

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (sub === 'add') {
      const queue = useQueue(interaction.guild.id);
      if (!queue || !queue.isPlaying() || !queue.currentTrack) {
        return interaction.reply({ content: '❌ Không có bài hát đang phát để gắn tag!', ephemeral: true });
      }

      const tagName = interaction.options.getString('tag_name');
      const track = queue.currentTrack;
      addTag(userId, track.url, track.title, tagName);

      return interaction.reply(`🏷️ Đã gắn tag **#${tagName.toLowerCase()}** cho bài hát: **${track.title}**!`);
    }

    if (sub === 'play') {
      const vCheck = checkVoice(interaction, true);
      if (!vCheck.ok) return interaction.reply({ content: vCheck.reason, ephemeral: true });

      const pCheck = checkBotPerms(vCheck.voiceChannel);
      if (!pCheck.ok) return interaction.reply({ content: pCheck.reason, ephemeral: true });

      await interaction.deferReply();
      const tagName = interaction.options.getString('tag_name');
      const tracks = getTracksByTag(userId, tagName);

      if (!tracks.length) {
        return interaction.editReply(`❌ Bạn chưa gắn tag **#${tagName}** cho bài hát nào!`);
      }

      const player = useMainPlayer();
      const settings = getSettings(interaction.guild.id);
      const queue = player.nodes.create(interaction.guild, {
        metadata: { channel: interaction.channel },
        selfDeaf: true,
        volume: settings.volume || 80,
      });

      if (!queue.connection) await queue.connect(vCheck.voiceChannel);

      const chunkSize = 5;
      for (let i = 0; i < tracks.length; i += chunkSize) {
        const chunk = tracks.slice(i, i + chunkSize);
        const results = await Promise.all(
          chunk.map(t => player.search(t.track_url || t.track_title, { requestedBy: interaction.user, searchEngine: QueryType.AUTO }).catch(() => null))
        );
        for (const res of results) {
          if (res?.hasTracks()) queue.addTrack(res.tracks[0]);
        }
      }

      if (!queue.isPlaying()) await queue.node.play();
      return interaction.editReply(`🏷️ Đang phát **${tracks.length}** bài hát có tag **#${tagName}**!`);
    }

    if (sub === 'list') {
      const tagName = interaction.options.getString('tag_name');
      if (tagName) {
        const tracks = getTracksByTag(userId, tagName);
        if (!tracks.length) return interaction.reply({ content: `❌ Không có bài nào có tag **#${tagName}**!`, ephemeral: true });

        const list = tracks.map((t, i) => `\`${i + 1}.\` **${t.track_title}**`).join('\n');
        const embed = baseEmbed({
          title: `🏷️ Bài hát gắn tag: #${tagName}`,
          description: list,
        });
        return interaction.reply({ embeds: [embed] });
      } else {
        const popular = getPopularTags(userId);
        if (!popular.length) return interaction.reply({ content: '❌ Bạn chưa tạo tag nào!', ephemeral: true });

        const list = popular.map(t => `• **#${t.tag}** (${t.count} bài)`).join('\n');
        const embed = baseEmbed({
          title: '🏷️ Các Tag của bạn',
          description: list,
        });
        return interaction.reply({ embeds: [embed] });
      }
    }
  },

  async executePrefix(message, args) {
    const action = (args[0] || '').toLowerCase();
    const userId = message.author.id;

    if (action === 'add') {
      const tagName = args.slice(1).join(' ');
      if (!tagName) return message.reply('❌ Vui lòng nhập tên tag! Ví dụ: `ni!tag add chill`');

      const queue = useQueue(message.guild.id);
      if (!queue || !queue.isPlaying() || !queue.currentTrack) {
        return message.reply('❌ Không có bài hát đang phát để gắn tag!');
      }

      const track = queue.currentTrack;
      addTag(userId, track.url, track.title, tagName);
      return message.reply(`🏷️ Đã gắn tag **#${tagName.toLowerCase()}** cho bài hát: **${track.title}**!`);
    }

    if (action === 'play') {
      const tagName = args.slice(1).join(' ');
      if (!tagName) return message.reply('❌ Vui lòng nhập tên tag! Ví dụ: `ni!tag play chill`');

      const vCheck = checkVoice(message, true);
      if (!vCheck.ok) return message.reply(vCheck.reason);

      const pCheck = checkBotPerms(vCheck.voiceChannel);
      if (!pCheck.ok) return message.reply(pCheck.reason);

      const tracks = getTracksByTag(userId, tagName);
      if (!tracks.length) return message.reply(`❌ Bạn chưa gắn tag **#${tagName}** cho bài hát nào!`);

      const msg = await message.reply(`⏳ Đang tải bài hát có tag **#${tagName}**...`);
      const player = useMainPlayer();
      const settings = getSettings(message.guild.id);
      const queue = player.nodes.create(message.guild, {
        metadata: { channel: message.channel },
        selfDeaf: true,
        volume: settings.volume || 80,
      });

      if (!queue.connection) await queue.connect(vCheck.voiceChannel);

      const chunkSize = 5;
      for (let i = 0; i < tracks.length; i += chunkSize) {
        const chunk = tracks.slice(i, i + chunkSize);
        const results = await Promise.all(
          chunk.map(t => player.search(t.track_url || t.track_title, { requestedBy: message.author, searchEngine: QueryType.AUTO }).catch(() => null))
        );
        for (const res of results) {
          if (res?.hasTracks()) queue.addTrack(res.tracks[0]);
        }
      }

      if (!queue.isPlaying()) await queue.node.play();
      return msg.edit(`🏷️ Đang phát **${tracks.length}** bài hát có tag **#${tagName}**!`);
    }

    // Default to list
    const popular = getPopularTags(userId);
    if (!popular.length) return message.reply('❌ Bạn chưa tạo tag nào! Dùng: `ni!tag add <tên tag>`');

    const list = popular.map(t => `• **#${t.tag}** (${t.count} bài)`).join('\n');
    const embed = baseEmbed({
      title: '🏷️ Các Tag của bạn',
      description: list,
      footer: 'Dùng ni!tag play <tên tag> để phát • 🎵 Ni Music Bot',
    });
    return message.reply({ embeds: [embed] });
  },
};
