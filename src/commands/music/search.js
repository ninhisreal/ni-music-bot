import { SlashCommandBuilder } from 'discord.js';
import { useMainPlayer } from 'discord-player';
import { checkVoice, checkBotPerms } from '../../guards/role-check.js';
import { buildSearchResultsEmbed } from '../../embeds/misc-embeds.js';
import { buildSearchSelectRow, buildPlatformSelectRow } from '../../buttons/search-select.js';
import { getSettings } from '../../database/models/settings.js';
import { searchByPlatform, resolvePlayableTrack } from '../../player/youtube-strategy.js';

/**
 * Standard node options — Studio HD Audio Quality.
 */
function getNodeOptions(channel, volume = 80) {
  return {
    metadata: { channel },
    selfDeaf: true,
    volume,
    leaveOnEmpty: true,
    leaveOnEmptyCooldown: 300_000,
    leaveOnEnd: true,
    leaveOnEndCooldown: 60_000,
    leaveOnStop: true,
    leaveOnStopCooldown: 5_000,
    skipOnNoStream: true,
    bufferingTimeout: 15_000,
    smoothVolume: true,
  };
}

async function handleTrackSelection(i, tracks, voiceChannel, channel, volume, player, collector) {
  const idx = parseInt(i.values[0], 10);
  const chosen = tracks[idx];
  await i.deferUpdate();
  collector.stop('selected');

  // Resolve to streamable audio source (bridges Deezer, Apple Music, etc.)
  const playable = await resolvePlayableTrack(player, chosen, { requestedBy: i.user });

  await player.play(voiceChannel, playable || chosen, {
    nodeOptions: getNodeOptions(channel, volume),
  });

  return { content: `✅ Đã chọn: **${chosen.title}**`, embeds: [], components: [] };
}

export default {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Tìm kiếm bài hát theo thứ tự ưu tiên: Deezer > Apple Music > Spotify > YouTube > SoundCloud')
    .addStringOption(opt =>
      opt.setName('query').setDescription('Tên bài hát cần tìm').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('platform')
        .setDescription('Chọn nền tảng')
        .addChoices(
          { name: '🔀 Tự động (Deezer > Apple Music > Spotify > YouTube > SoundCloud)', value: 'auto' },
          { name: '💜 Deezer', value: 'deezer' },
          { name: '🎵 Apple Music', value: 'applemusic' },
          { name: '🟢 Spotify', value: 'spotify' },
          { name: '▶️ YouTube', value: 'youtube' },
          { name: '🟠 SoundCloud', value: 'soundcloud' }
        )
    ),
  aliases: ['find'],

  async execute(interaction) {
    const vCheck = checkVoice(interaction, true);
    if (!vCheck.ok) return interaction.reply({ content: vCheck.reason, ephemeral: true });
    const pCheck = checkBotPerms(vCheck.voiceChannel);
    if (!pCheck.ok) return interaction.reply({ content: pCheck.reason, ephemeral: true });

    await interaction.deferReply();
    const query = interaction.options.getString('query');
    let currentPlatform = interaction.options.getString('platform') || 'auto';
    const player = useMainPlayer();
    const settings = getSettings(interaction.guild.id);

    let tracks = await searchByPlatform(player, query, currentPlatform, { requestedBy: interaction.user });
    if (!tracks?.length) return interaction.editReply(`❌ Không tìm thấy: **${query}**`);

    const response = await interaction.editReply({
      embeds: [buildSearchResultsEmbed(tracks, query)],
      components: [buildSearchSelectRow(tracks), buildPlatformSelectRow(currentPlatform)],
    });

    const collector = response.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 60_000,
    });

    collector.on('collect', async (i) => {
      if (i.customId.startsWith('search_platform_')) {
        currentPlatform = i.customId.replace('search_platform_', '');
        await i.deferUpdate();
        tracks = await searchByPlatform(player, query, currentPlatform, { requestedBy: interaction.user });
        if (tracks?.length) {
          await interaction.editReply({
            embeds: [buildSearchResultsEmbed(tracks, query)],
            components: [buildSearchSelectRow(tracks), buildPlatformSelectRow(currentPlatform)],
          });
        }
        return;
      }
      if (i.customId === 'select_search_track') {
        const result = await handleTrackSelection(i, tracks, vCheck.voiceChannel, interaction.channel, settings.volume || 80, player, collector);
        return interaction.editReply(result);
      }
    });

    collector.on('end', (_, reason) => {
      if (reason !== 'selected') interaction.editReply({ components: [] }).catch(() => {});
    });
  },

  async executePrefix(message, args) {
    if (!args.length) return message.reply('❌ Nhập từ khóa! VD: `ni!search Lạc Trôi`');

    const vCheck = checkVoice(message, true);
    if (!vCheck.ok) return message.reply(vCheck.reason);
    const pCheck = checkBotPerms(vCheck.voiceChannel);
    if (!pCheck.ok) return message.reply(pCheck.reason);

    let currentPlatform = 'auto';
    let query = args.join(' ');
    const PREFIXES = [[/^dz:|^deezer:/, 'deezer'], [/^sp:|^spotify:/, 'spotify'], [/^am:|^apple:|^applemusic:/, 'applemusic'], [/^yt:|^youtube:/, 'youtube'], [/^sc:|^soundcloud:/, 'soundcloud']];
    for (const [regex, p] of PREFIXES) {
      if (regex.test(query)) { currentPlatform = p; query = query.replace(regex, '').trim(); break; }
    }

    const player = useMainPlayer();
    const settings = getSettings(message.guild.id);
    const msg = await message.reply(`⏳ Đang tìm **${query}**...`);

    let tracks = await searchByPlatform(player, query, currentPlatform, { requestedBy: message.author });
    if (!tracks?.length) return msg.edit(`❌ Không tìm thấy: **${query}**`);

    await msg.edit({
      content: '',
      embeds: [buildSearchResultsEmbed(tracks, query)],
      components: [buildSearchSelectRow(tracks), buildPlatformSelectRow(currentPlatform)],
    });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 60_000,
    });

    collector.on('collect', async (i) => {
      if (i.customId.startsWith('search_platform_')) {
        currentPlatform = i.customId.replace('search_platform_', '');
        await i.deferUpdate();
        tracks = await searchByPlatform(player, query, currentPlatform, { requestedBy: message.author });
        if (tracks?.length) {
          await msg.edit({
            embeds: [buildSearchResultsEmbed(tracks, query)],
            components: [buildSearchSelectRow(tracks), buildPlatformSelectRow(currentPlatform)],
          });
        }
        return;
      }
      if (i.customId === 'select_search_track') {
        const result = await handleTrackSelection(i, tracks, vCheck.voiceChannel, message.channel, settings.volume || 80, player, collector);
        return msg.edit(result);
      }
    });

    collector.on('end', (_, reason) => {
      if (reason !== 'selected') msg.edit({ components: [] }).catch(() => {});
    });
  },
};
