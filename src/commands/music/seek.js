import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { checkVoice, checkDjRole } from '../../guards/role-check.js';
import { parseDuration, formatSeconds } from '../../utils/duration.js';

export default {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Tua đến một vị trí cụ thể trong bài hát đang phát')
    .addStringOption(opt =>
      opt.setName('position')
        .setDescription('Vị trí cần tua đến (ví dụ: 1:30 hoặc 90)')
        .setRequired(true)
    ),
  aliases: [],

  async execute(interaction) {
    const vCheck = checkVoice(interaction);
    if (!vCheck.ok) return interaction.reply({ content: vCheck.reason, ephemeral: true });

    const dj = checkDjRole(interaction);
    if (!dj.ok) return interaction.reply({ content: dj.reason, ephemeral: true });

    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.isPlaying()) {
      return interaction.reply({ content: '❌ Không có bài hát nào đang phát!', ephemeral: true });
    }

    const posStr = interaction.options.getString('position');
    const sec = parseDuration(posStr);
    const ms = sec * 1000;
    const maxMs = queue.currentTrack?.durationMS || 0;

    if (ms < 0 || (maxMs > 0 && ms > maxMs)) {
      return interaction.reply({
        content: `❌ Vị trí không hợp lệ! Thời lượng bài hát là **${queue.currentTrack?.duration}**.`,
        ephemeral: true,
      });
    }

    await queue.node.seek(ms);
    return interaction.reply(`⏩ Đã tua đến **${formatSeconds(sec)}**`);
  },

  async executePrefix(message, args) {
    const vCheck = checkVoice(message);
    if (!vCheck.ok) return message.reply(vCheck.reason);

    const dj = checkDjRole(message);
    if (!dj.ok) return message.reply(dj.reason);

    const queue = useQueue(message.guild.id);
    if (!queue || !queue.isPlaying()) {
      return message.reply('❌ Không có bài hát nào đang phát!');
    }

    if (!args.length) {
      return message.reply('❌ Vui lòng nhập vị trí cần tua! Ví dụ: `ni!seek 1:30`');
    }

    const sec = parseDuration(args[0]);
    const ms = sec * 1000;
    const maxMs = queue.currentTrack?.durationMS || 0;

    if (ms < 0 || (maxMs > 0 && ms > maxMs)) {
      return message.reply(`❌ Vị trí không hợp lệ! Thời lượng bài hát là **${queue.currentTrack?.duration}**.`);
    }

    await queue.node.seek(ms);
    return message.reply(`⏩ Đã tua đến **${formatSeconds(sec)}**`);
  },
};
