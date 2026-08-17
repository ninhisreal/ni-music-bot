import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { checkVoice, checkDjRole } from '../../guards/role-check.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Tạm dừng phát nhạc'),
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

    if (queue.node.isPaused()) {
      return interaction.reply({ content: '⚠️ Nhạc đã được tạm dừng trước đó rồi!', ephemeral: true });
    }

    queue.node.pause();
    return interaction.reply('⏸️ Đã tạm dừng phát nhạc. Dùng `/resume` để tiếp tục!');
  },

  async executePrefix(message) {
    const vCheck = checkVoice(message);
    if (!vCheck.ok) return message.reply(vCheck.reason);

    const dj = checkDjRole(message);
    if (!dj.ok) return message.reply(dj.reason);

    const queue = useQueue(message.guild.id);
    if (!queue || !queue.isPlaying()) {
      return message.reply('❌ Không có bài hát nào đang phát!');
    }

    if (queue.node.isPaused()) {
      return message.reply('⚠️ Nhạc đã được tạm dừng trước đó rồi!');
    }

    queue.node.pause();
    return message.reply('⏸️ Đã tạm dừng phát nhạc. Dùng `ni!resume` để tiếp tục!');
  },
};
