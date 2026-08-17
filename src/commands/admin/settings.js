import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { getSettings, setAutoDJ, setVolume } from '../../database/models/settings.js';
import { baseEmbed } from '../../embeds/builder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Xem và quản lý các thiết lập của server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(opt =>
      opt.setName('auto_dj')
        .setDescription('Bật hoặc tắt tính năng Auto-DJ tự động thêm bài khi hết queue')
    )
    .addIntegerOption(opt =>
      opt.setName('default_volume')
        .setDescription('Âm lượng mặc định khi phát bài mới (0-200)')
        .setMinValue(0)
        .setMaxValue(200)
    ),
  aliases: ['config'],

  async execute(interaction) {
    const guildId = interaction.guild.id;

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const s = getSettings(guildId);
      const embed = baseEmbed({
        title: `⚙️ Cài đặt Server ${interaction.guild.name}`,
        description:
          `🎧 **DJ Role:** ${s.dj_role_id ? `<@&${s.dj_role_id}>` : 'Tất cả mọi người'}\n` +
          `🔒 **Khóa phòng:** ${s.locked_channel_id ? `<#${s.locked_channel_id}>` : 'Không khóa'}\n` +
          `🤖 **Auto-DJ:** ${s.auto_dj_enabled ? '✅ Bật' : '❌ Tắt'}\n` +
          `🔊 **Âm lượng mặc định:** ${s.volume}%\n` +
          `🌐 **Ngôn ngữ:** ${s.language.toUpperCase()}`,
      });
      return interaction.reply({ embeds: [embed] });
    }

    const autoDj = interaction.options.getBoolean('auto_dj');
    const defVol = interaction.options.getInteger('default_volume');

    if (autoDj !== null) setAutoDJ(guildId, autoDj);
    if (defVol !== null) setVolume(guildId, defVol);

    const s = getSettings(guildId);
    const embed = baseEmbed({
      title: `⚙️ Cài đặt Server ${interaction.guild.name}`,
      description:
        `🎧 **DJ Role:** ${s.dj_role_id ? `<@&${s.dj_role_id}>` : 'Tất cả mọi người'}\n` +
        `🔒 **Khóa phòng:** ${s.locked_channel_id ? `<#${s.locked_channel_id}>` : 'Không khóa'}\n` +
        `🤖 **Auto-DJ:** ${s.auto_dj_enabled ? '✅ Bật' : '❌ Tắt'}\n` +
        `🔊 **Âm lượng mặc định:** ${s.volume}%\n` +
        `🌐 **Ngôn ngữ:** ${s.language.toUpperCase()}`,
    });

    return interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const guildId = message.guild.id;
    const action = args[0]?.toLowerCase();

    if (action === 'autodj' && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const enable = args[1]?.toLowerCase() === 'on' || args[1]?.toLowerCase() === 'true' || args[1] === '1';
      setAutoDJ(guildId, enable);
      return message.reply(`🤖 Đã ${enable ? 'bật' : 'tắt'} Auto-DJ!`);
    }

    const s = getSettings(guildId);
    const embed = baseEmbed({
      title: `⚙️ Cài đặt Server ${message.guild.name}`,
      description:
        `🎧 **DJ Role:** ${s.dj_role_id ? `<@&${s.dj_role_id}>` : 'Tất cả mọi người'}\n` +
        `🔒 **Khóa phòng:** ${s.locked_channel_id ? `<#${s.locked_channel_id}>` : 'Không khóa'}\n` +
        `🤖 **Auto-DJ:** ${s.auto_dj_enabled ? '✅ Bật' : '❌ Tắt'}\n` +
        `🔊 **Âm lượng mặc định:** ${s.volume}%\n` +
        `🌐 **Ngôn ngữ:** ${s.language.toUpperCase()}`,
    });
    return message.reply({ embeds: [embed] });
  },
};
