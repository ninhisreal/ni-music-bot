import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { setSchedule, clearSchedule, getSchedule } from '../../player/scheduled-playback.js';
import { getPlaylistByName } from '../../database/models/playlist.js';
import { isUserPremium, isGuildPremium } from '../../database/models/premium.js';

export default {
  data: new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Lên lịch phát playlist tự động vào một khung giờ hàng ngày (Yêu cầu Premium)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Đặt lịch phát playlist hàng ngày')
        .addStringOption(opt =>
          opt.setName('time')
            .setDescription('Giờ phát theo định dạng 24h: HH:MM (ví dụ: 08:30 hoặc 21:00)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('playlist_name')
            .setDescription('Tên playlist của bạn cần phát')
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName('voice_channel')
            .setDescription('Kênh thoại để bot tham gia phát')
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('clear')
        .setDescription('Hủy lịch phát nhạc tự động hiện tại')
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('Xem lịch phát nhạc tự động hiện tại')
    ),
  aliases: [],

  async execute(interaction) {
    const isPrem = isUserPremium(interaction.user.id) || isGuildPremium(interaction.guild.id);
    if (!isPrem) {
      return interaction.reply({
        content: '⭐ Tính năng **Lên lịch phát nhạc tự động** yêu cầu gói Premium! Dùng `/premium` để xem chi tiết.',
        ephemeral: true,
      });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'clear') {
      clearSchedule(guildId);
      return interaction.reply('✅ Đã hủy lịch phát nhạc tự động của server.');
    }

    if (sub === 'view') {
      const s = getSchedule(guildId);
      if (!s) return interaction.reply('❌ Server chưa thiết lập lịch phát nhạc tự động nào.');
      return interaction.reply(`⏰ **Lịch hiện tại:** Phát hàng ngày lúc **${s.cron_time}** tại kênh thoại <#${s.vc_channel_id || s.channel_id}>.`);
    }

    if (sub === 'set') {
      const time = interaction.options.getString('time').trim();
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(time)) {
        return interaction.reply({ content: '❌ Định dạng giờ không hợp lệ! Vui lòng nhập dạng HH:MM (ví dụ: `08:00`, `19:30`).', ephemeral: true });
      }

      const formattedTime = time.length === 4 ? `0${time}` : time;
      const plName = interaction.options.getString('playlist_name').trim();
      const pl = getPlaylistByName(interaction.user.id, plName);

      if (!pl) {
        return interaction.reply({ content: `❌ Không tìm thấy playlist tên **${plName}** của bạn!`, ephemeral: true });
      }

      const vc = interaction.options.getChannel('voice_channel');
      setSchedule(guildId, pl.id, formattedTime, interaction.channel.id, vc.id, interaction.user.id);

      return interaction.reply(`⏰ **Đã lên lịch thành công!** Bot sẽ tự động vào <#${vc.id}> và phát playlist **${plName}** lúc **${formattedTime}** hàng ngày.`);
    }
  },

  async executePrefix(message, args) {
    const isPrem = isUserPremium(message.author.id) || isGuildPremium(message.guild.id);
    if (!isPrem) {
      return message.reply('⭐ Tính năng **Lên lịch phát nhạc tự động** yêu cầu gói Premium!');
    }

    const action = args[0]?.toLowerCase();
    const guildId = message.guild.id;

    if (action === 'clear') {
      clearSchedule(guildId);
      return message.reply('✅ Đã hủy lịch phát nhạc tự động của server.');
    }

    const s = getSchedule(guildId);
    if (!s) {
      return message.reply('❌ Chưa có lịch phát nhạc. Dùng lệnh Slash `/schedule set` để cấu hình chi tiết.');
    }
    return message.reply(`⏰ **Lịch hiện tại:** Phát hàng ngày lúc **${s.cron_time}**.`);
  },
};
