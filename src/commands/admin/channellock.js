import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { setLockedChannel, getSettings } from '../../database/models/settings.js';

export default {
  data: new SlashCommandBuilder()
    .setName('channellock')
    .setDescription('Khóa bot vào một voice channel cụ thể hoặc mở khóa')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Kênh thoại muốn khóa bot vào (để trống để mở khóa)')
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    ),
  aliases: ['lockchannel', 'lockvc'],

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Bạn cần quyền Administrator để thực hiện lệnh này!', ephemeral: true });
    }

    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    if (!channel) {
      setLockedChannel(guildId, null);
      return interaction.reply('🔓 Đã mở khóa kênh thoại! Bot có thể tham gia bất kỳ phòng thoại nào.');
    }

    setLockedChannel(guildId, channel.id);
    return interaction.reply(`🔒 Đã khóa bot vào phòng thoại: <#${channel.id}>. Bot sẽ từ chối tham gia các phòng khác.`);
  },

  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Bạn cần quyền Administrator để thực hiện lệnh này!');
    }

    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
    const guildId = message.guild.id;

    if (args[0]?.toLowerCase() === 'clear' || args[0]?.toLowerCase() === 'unlock') {
      setLockedChannel(guildId, null);
      return message.reply('🔓 Đã mở khóa kênh thoại! Bot có thể tham gia bất kỳ phòng thoại nào.');
    }

    if (!channel || !channel.isVoiceBased?.()) {
      const current = getSettings(guildId);
      const curText = current.locked_channel_id ? `<#${current.locked_channel_id}>` : 'Không khóa';
      return message.reply(`🔒 Kênh đang khóa hiện tại: ${curText}\nCú pháp: \`ni!lockvc <id/kênh>\` hoặc \`ni!lockvc unlock\``);
    }

    setLockedChannel(guildId, channel.id);
    return message.reply(`🔒 Đã khóa bot vào phòng thoại: <#${channel.id}>.`);
  },
};
