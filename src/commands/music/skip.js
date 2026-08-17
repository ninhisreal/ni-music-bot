import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { checkVoice, checkDjRole } from '../../guards/role-check.js';

export default {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Bỏ qua bài hát đang phát'),
  aliases: ['s', 'next'],

  async execute(interaction) {
    const vCheck = checkVoice(interaction);
    if (!vCheck.ok) return interaction.reply({ content: vCheck.reason, ephemeral: true });

    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.isPlaying()) {
      return interaction.reply({ content: '❌ Không có bài hát nào đang phát!', ephemeral: true });
    }

    const currentTitle = queue.currentTrack?.title || 'bài hát';
    queue.node.skip();
    return interaction.reply(`⏭️ Đã bỏ qua **${currentTitle}**`);
  },

  async executePrefix(message) {
    const vCheck = checkVoice(message);
    if (!vCheck.ok) return message.reply(vCheck.reason);

    const queue = useQueue(message.guild.id);
    if (!queue || !queue.isPlaying()) {
      return message.reply('❌ Không có bài hát nào đang phát!');
    }

    const currentTitle = queue.currentTrack?.title || 'bài hát';
    queue.node.skip();
    return message.reply(`⏭️ Đã bỏ qua **${currentTitle}**`);
  },
};
