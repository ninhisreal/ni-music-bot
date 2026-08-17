import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { checkVoice, checkDjRole } from '../../guards/role-check.js';

export default {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Điều chỉnh âm lượng phát nhạc (0 - 200%)')
    .addIntegerOption(opt =>
      opt.setName('percent')
        .setDescription('Mức âm lượng từ 0 đến 200')
        .setMinValue(0)
        .setMaxValue(200)
        .setRequired(true)
    ),
  aliases: ['vol', 'v'],

  async execute(interaction) {
    const vCheck = checkVoice(interaction);
    if (!vCheck.ok) return interaction.reply({ content: vCheck.reason, ephemeral: true });

    const dj = checkDjRole(interaction);
    if (!dj.ok) return interaction.reply({ content: dj.reason, ephemeral: true });

    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.isPlaying()) {
      return interaction.reply({ content: '❌ Không có bài hát nào đang phát!', ephemeral: true });
    }

    const vol = interaction.options.getInteger('percent');
    queue.node.setVolume(vol);

    return interaction.reply(`🔊 Đã đặt âm lượng thành **${vol}%**`);
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

    const vol = parseInt(args[0], 10);
    if (isNaN(vol) || vol < 0 || vol > 200) {
      return message.reply(`🔊 Âm lượng hiện tại: **${queue.node.volume}%**. Dùng: \`ni!volume 0-200\` để thay đổi.`);
    }

    queue.node.setVolume(vol);
    return message.reply(`🔊 Đã đặt âm lượng thành **${vol}%**`);
  },
};
