import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { checkVoice, checkDjRole } from '../../guards/role-check.js';

export default {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Xáo trộn thông minh các bài hát trong hàng đợi'),
  aliases: ['sh'],

  async execute(interaction) {
    const vCheck = checkVoice(interaction);
    if (!vCheck.ok) return interaction.reply({ content: vCheck.reason, ephemeral: true });

    const dj = checkDjRole(interaction);
    if (!dj.ok) return interaction.reply({ content: dj.reason, ephemeral: true });

    const queue = useQueue(interaction.guild.id);
    if (!queue || queue.tracks.size === 0) {
      return interaction.reply({ content: '❌ Hàng đợi không có bài hát nào để xáo trộn!', ephemeral: true });
    }

    queue.tracks.shuffle();
    return interaction.reply(`🔀 Đã xáo trộn **${queue.tracks.size}** bài hát trong hàng đợi!`);
  },

  async executePrefix(message) {
    const vCheck = checkVoice(message);
    if (!vCheck.ok) return message.reply(vCheck.reason);

    const dj = checkDjRole(message);
    if (!dj.ok) return message.reply(dj.reason);

    const queue = useQueue(message.guild.id);
    if (!queue || queue.tracks.size === 0) {
      return message.reply('❌ Hàng đợi không có bài hát nào để xáo trộn!');
    }

    queue.tracks.shuffle();
    return message.reply(`🔀 Đã xáo trộn **${queue.tracks.size}** bài hát trong hàng đợi!`);
  },
};
