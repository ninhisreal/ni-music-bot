import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { checkVoice, checkDjRole } from '../../guards/role-check.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Dừng phát nhạc và xóa toàn bộ hàng đợi'),
  aliases: ['leave', 'dc', 'disconnect'],

  async execute(interaction) {
    const vCheck = checkVoice(interaction);
    if (!vCheck.ok) return interaction.reply({ content: vCheck.reason, ephemeral: true });

    const dj = checkDjRole(interaction);
    if (!dj.ok) return interaction.reply({ content: dj.reason, ephemeral: true });

    const queue = useQueue(interaction.guild.id);
    if (!queue) {
      return interaction.reply({ content: '❌ Bot hiện không phát nhạc!', ephemeral: true });
    }

    queue.delete();
    return interaction.reply('⏹️ Đã dừng phát nhạc và xóa hàng đợi!');
  },

  async executePrefix(message) {
    const vCheck = checkVoice(message);
    if (!vCheck.ok) return message.reply(vCheck.reason);

    const dj = checkDjRole(message);
    if (!dj.ok) return message.reply(dj.reason);

    const queue = useQueue(message.guild.id);
    if (!queue) {
      return message.reply('❌ Bot hiện không phát nhạc!');
    }

    queue.delete();
    return message.reply('⏹️ Đã dừng phát nhạc và xóa hàng đợi!');
  },
};
