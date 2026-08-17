import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { setDjRole, setLockedChannel, getSettings } from '../../database/models/settings.js';
import { baseEmbed } from '../../embeds/builder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Thiết lập nhanh các cấu hình bot cho server của bạn')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(opt =>
      opt.setName('dj_role')
        .setDescription('Role được quyền điều khiển bot (DJ Role)')
    )
    .addChannelOption(opt =>
      opt.setName('locked_voice')
        .setDescription('Kênh thoại duy nhất bot được phép tham gia')
    ),
  aliases: [],

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Bạn cần quyền Administrator để thực hiện lệnh này!', ephemeral: true });
    }

    const djRole = interaction.options.getRole('dj_role');
    const lockedVoice = interaction.options.getChannel('locked_voice');
    const guildId = interaction.guild.id;

    if (djRole) setDjRole(guildId, djRole.id);
    if (lockedVoice) setLockedChannel(guildId, lockedVoice.id);

    const updated = getSettings(guildId);
    const embed = baseEmbed({
      title: `⚙️ Cấu hình Bot cho ${interaction.guild.name}`,
      description:
        `🎧 **DJ Role:** ${updated.dj_role_id ? `<@&${updated.dj_role_id}>` : 'Chưa đặt (Tất cả mọi người)'}\n` +
        `🔒 **Khóa kênh thoại:** ${updated.locked_channel_id ? `<#${updated.locked_channel_id}>` : 'Không khóa (Tham gia mọi kênh)'}\n` +
        `🔊 **Âm lượng mặc định:** ${updated.volume}%\n` +
        `🌐 **Ngôn ngữ:** ${updated.language === 'vi' ? 'Tiếng Việt' : 'English'}`,
    });

    return interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Bạn cần quyền Administrator để thực hiện lệnh này!');
    }

    const updated = getSettings(message.guild.id);
    const embed = baseEmbed({
      title: `⚙️ Cấu hình Bot cho ${message.guild.name}`,
      description:
        `🎧 **DJ Role:** ${updated.dj_role_id ? `<@&${updated.dj_role_id}>` : 'Chưa đặt (Tất cả mọi người)'}\n` +
        `🔒 **Khóa kênh thoại:** ${updated.locked_channel_id ? `<#${updated.locked_channel_id}>` : 'Không khóa'}\n` +
        `🔊 **Âm lượng mặc định:** ${updated.volume}%\n` +
        `🌐 **Ngôn ngữ:** ${updated.language === 'vi' ? 'Tiếng Việt' : 'English'}\n\n` +
        `Dùng các lệnh: \`ni!djrole\`, \`ni!channellock\`, \`ni!language\` để tùy chỉnh.`,
    });

    return message.reply({ embeds: [embed] });
  },
};
