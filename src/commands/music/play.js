import { SlashCommandBuilder } from 'discord.js';
import { useMainPlayer } from 'discord-player';
import { checkVoice, checkBotPerms } from '../../guards/role-check.js';
import { searchByPlatform, resolvePlayableTrack } from '../../player/youtube-strategy.js';
import { getSettings } from '../../database/models/settings.js';
import { logger } from '../../utils/logger.js';

/**
 * Standard node options for all playback — Studio HD Audio Quality.
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

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Tìm kiếm và phát nhạc theo thứ tự ưu tiên: Deezer > Apple Music > Spotify > YouTube > SoundCloud')
    .addStringOption(opt =>
      opt.setName('query')
        .setDescription('Tên bài hát, URL Deezer, Apple Music, Spotify, YouTube, SoundCloud...')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('platform')
        .setDescription('Chọn nền tảng tìm kiếm cụ thể')
        .addChoices(
          { name: '🔀 Tự động (Deezer > Apple Music > Spotify > YouTube > SoundCloud)', value: 'auto' },
          { name: '💜 Deezer', value: 'deezer' },
          { name: '🎵 Apple Music', value: 'applemusic' },
          { name: '🟢 Spotify', value: 'spotify' },
          { name: '▶️ YouTube', value: 'youtube' },
          { name: '🟠 SoundCloud', value: 'soundcloud' }
        )
    ),
  aliases: ['p', 'dz', 'am', 'sp', 'yt', 'sc'],

  async execute(interaction) {
    const vCheck = checkVoice(interaction, true);
    if (!vCheck.ok) return interaction.reply({ content: vCheck.reason, ephemeral: true });

    const pCheck = checkBotPerms(vCheck.voiceChannel);
    if (!pCheck.ok) return interaction.reply({ content: pCheck.reason, ephemeral: true });

    await interaction.deferReply();
    const query = interaction.options.getString('query');
    const platform = interaction.options.getString('platform') || 'auto';
    const player = useMainPlayer();
    const settings = getSettings(interaction.guild.id);

    try {
      const tracks = await searchByPlatform(player, query, platform, {
        requestedBy: interaction.user,
      });

      if (!tracks?.length) {
        return interaction.editReply(`❌ Không tìm thấy kết quả cho: **${query}**`);
      }

      const playable = await resolvePlayableTrack(player, tracks[0], { requestedBy: interaction.user });

      const { track } = await player.play(vCheck.voiceChannel, playable || tracks[0], {
        nodeOptions: getNodeOptions(interaction.channel, settings.volume || 80),
      });

      return interaction.editReply(`✅ Đã thêm **${track.title}** vào hàng đợi!`);
    } catch (err) {
      logger.error('Play', err.message);
      return interaction.editReply(`❌ Lỗi: ${err.message}`);
    }
  },

  async executePrefix(message, args) {
    if (!args.length) {
      return message.reply('❌ Nhập tên bài hát hoặc link! VD: `ni!p Shape of You` hoặc `ni!p https://...`');
    }

    const vCheck = checkVoice(message, true);
    if (!vCheck.ok) return message.reply(vCheck.reason);

    const pCheck = checkBotPerms(vCheck.voiceChannel);
    if (!pCheck.ok) return message.reply(pCheck.reason);

    let platform = 'auto';
    let query = args.join(' ');

    // Detect platform from alias or prefix
    const cmd = message.content.slice(3).trim().split(' ')[0]?.toLowerCase();
    const PLATFORM_ALIASES = { dz: 'deezer', sp: 'spotify', am: 'applemusic', yt: 'youtube', sc: 'soundcloud' };
    const PLATFORM_PREFIXES = [
      [/^dz:|^deezer:/, 'deezer'],
      [/^sp:|^spotify:/, 'spotify'],
      [/^am:|^apple:|^applemusic:/, 'applemusic'],
      [/^yt:|^youtube:/, 'youtube'],
      [/^sc:|^soundcloud:/, 'soundcloud'],
    ];

    if (PLATFORM_ALIASES[cmd]) {
      platform = PLATFORM_ALIASES[cmd];
    } else {
      for (const [regex, p] of PLATFORM_PREFIXES) {
        if (regex.test(query)) {
          platform = p;
          query = query.replace(regex, '').trim();
          break;
        }
      }
    }

    const player = useMainPlayer();
    const settings = getSettings(message.guild.id);
    const msg = await message.reply(`⏳ Đang tìm **${query}**...`);

    try {
      const tracks = await searchByPlatform(player, query, platform, {
        requestedBy: message.author,
      });

      if (!tracks?.length) return msg.edit(`❌ Không tìm thấy bài hát cho: **${query}**`);

      const playable = await resolvePlayableTrack(player, tracks[0], { requestedBy: message.author });

      const { track } = await player.play(vCheck.voiceChannel, playable || tracks[0], {
        nodeOptions: getNodeOptions(message.channel, settings.volume || 80),
      });

      return msg.edit(`✅ Đã thêm **${track.title}** vào hàng đợi!`);
    } catch (err) {
      logger.error('Play', err.message);
      return msg.edit(`❌ Lỗi: ${err.message}`);
    }
  },
};
