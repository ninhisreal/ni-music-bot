import { SlashCommandBuilder } from 'discord.js';
import { useMainPlayer, QueryType } from 'discord-player';
import { checkVoice, checkBotPerms } from '../../guards/role-check.js';
import { importPlaylistCode } from '../../database/models/playlist.js';
import { getSettings } from '../../database/models/settings.js';

export default {
  data: new SlashCommandBuilder()
    .setName('playlist-import')
    .setDescription('Nhập và phát playlist từ một mã code 8 ký tự')
    .addStringOption(opt =>
      opt.setName('code')
        .setDescription('Mã code playlist (ví dụ: aB3xK9mQ)')
        .setRequired(true)
    ),
  aliases: ['pl-import', 'plimport'],

  async execute(interaction) {
    const vCheck = checkVoice(interaction, true);
    if (!vCheck.ok) return interaction.reply({ content: vCheck.reason, ephemeral: true });

    const pCheck = checkBotPerms(vCheck.voiceChannel);
    if (!pCheck.ok) return interaction.reply({ content: pCheck.reason, ephemeral: true });

    await interaction.deferReply();
    const code = interaction.options.getString('code').trim();
    const tracks = importPlaylistCode(code);

    if (!tracks || !tracks.length) {
      return interaction.editReply(`❌ Mã code \`${code}\` không hợp lệ hoặc đã hết hạn!`);
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

    return interaction.editReply(`📥 Đã nhập và phát playlist từ mã \`${code}\` (**${tracks.length}** bài)!`);
  },

  async executePrefix(message, args) {
    if (!args.length) {
      return message.reply('❌ Vui lòng nhập mã code playlist! Ví dụ: `ni!plimport aB3xK9mQ`');
    }

    const vCheck = checkVoice(message, true);
    if (!vCheck.ok) return message.reply(vCheck.reason);

    const pCheck = checkBotPerms(vCheck.voiceChannel);
    if (!pCheck.ok) return message.reply(pCheck.reason);

    const code = args[0].trim();
    const tracks = importPlaylistCode(code);

    if (!tracks || !tracks.length) {
      return message.reply(`❌ Mã code \`${code}\` không hợp lệ hoặc đã hết hạn!`);
    }

    const msg = await message.reply(`⏳ Đang tải playlist từ mã \`${code}\` (${tracks.length} bài)...`);
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

    return msg.edit(`📥 Đã nhập và phát playlist từ mã \`${code}\` (**${tracks.length}** bài)!`);
  },
};
