import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { checkVoice, checkDjRole } from '../../guards/role-check.js';
import { setSleepTimer, clearSleepTimer, hasSleepTimer } from '../../player/sleep-timer.js';

export default {
  data: new SlashCommandBuilder()
    .setName('sleeptimer')
    .setDescription('Hẹn giờ tự động tắt nhạc và rời kênh thoại sau số phút chỉ định')
    .addIntegerOption(opt =>
      opt.setName('minutes')
        .setDescription('Số phút để tắt (1 - 360 phút, nhập 0 để hủy)')
        .setMinValue(0)
        .setMaxValue(360)
        .setRequired(true)
    ),
  aliases: ['sleep', 'st'],

  async execute(interaction) {
    const vCheck = checkVoice(interaction);
    if (!vCheck.ok) return interaction.reply({ content: vCheck.reason, ephemeral: true });

    const dj = checkDjRole(interaction);
    if (!dj.ok) return interaction.reply({ content: dj.reason, ephemeral: true });

    const queue = useQueue(interaction.guild.id);
    const minutes = interaction.options.getInteger('minutes');
    const guildId = interaction.guild.id;

    if (minutes === 0) {
      if (clearSleepTimer(guildId)) {
        return interaction.reply('✅ Đã hủy hẹn giờ tắt nhạc!');
      }
      return interaction.reply({ content: '❌ Hiện không có hẹn giờ nào đang chạy!', ephemeral: true });
    }

    setSleepTimer(guildId, minutes, queue, interaction.channel);
    return interaction.reply(`💤 **Đã đặt hẹn giờ!** Bot sẽ tự động tắt nhạc và rời kênh sau **${minutes}** phút.`);
  },

  async executePrefix(message, args) {
    const vCheck = checkVoice(message);
    if (!vCheck.ok) return message.reply(vCheck.reason);

    const dj = checkDjRole(message);
    if (!dj.ok) return message.reply(dj.reason);

    const queue = useQueue(message.guild.id);
    const guildId = message.guild.id;
    const minutes = parseInt(args[0], 10);

    if (isNaN(minutes)) {
      if (hasSleepTimer(guildId)) {
        return message.reply('💤 Hiện đang có hẹn giờ hoạt động. Dùng `ni!sleeptimer 0` để hủy.');
      }
      return message.reply('❌ Vui lòng nhập số phút! Ví dụ: `ni!sleeptimer 30`');
    }

    if (minutes === 0) {
      if (clearSleepTimer(guildId)) {
        return message.reply('✅ Đã hủy hẹn giờ tắt nhạc!');
      }
      return message.reply('❌ Hiện không có hẹn giờ nào đang chạy!');
    }

    setSleepTimer(guildId, minutes, queue, message.channel);
    return message.reply(`💤 **Đã đặt hẹn giờ!** Bot sẽ tự động tắt nhạc và rời kênh sau **${minutes}** phút.`);
  },
};
