import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { checkVoice } from '../../guards/role-check.js';

// Map: guildId -> Set<userId>
const voteSkips = new Map();

export default {
  data: new SlashCommandBuilder()
    .setName('voteskip')
    .setDescription('Bỏ phiếu skip bài hát hiện tại (cần >50% người trong phòng đồng ý)'),
  aliases: ['vs'],

  async execute(interaction) {
    const vCheck = checkVoice(interaction);
    if (!vCheck.ok) return interaction.reply({ content: vCheck.reason, ephemeral: true });

    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.isPlaying() || !queue.currentTrack) {
      return interaction.reply({ content: '❌ Không có bài hát nào đang phát!', ephemeral: true });
    }

    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const vc = vCheck.voiceChannel;

    // Count listeners in VC (excluding bots)
    const listeners = vc.members.filter(m => !m.user.bot).size;
    if (listeners <= 1) {
      const title = queue.currentTrack.title;
      queue.node.skip();
      return interaction.reply(`⏭️ Chỉ có bạn trong phòng! Đã bỏ qua **${title}**`);
    }

    let votes = voteSkips.get(guildId);
    if (!votes) {
      votes = new Set();
      voteSkips.set(guildId, votes);
    }

    if (votes.has(userId)) {
      return interaction.reply({ content: '❌ Bạn đã bỏ phiếu rồi!', ephemeral: true });
    }

    votes.add(userId);
    const needed = Math.ceil(listeners / 2);

    if (votes.size >= needed) {
      const title = queue.currentTrack.title;
      const count = votes.size;
      votes.clear();
      queue.node.skip();
      return interaction.reply(`✅ Đủ **${count}/${needed}** phiếu! Đã bỏ qua **${title}**`);
    }

    return interaction.reply(`👥 **${interaction.user.username}** đã bỏ phiếu skip! (**${votes.size}/${needed}** phiếu cần thiết)`);
  },

  async executePrefix(message) {
    const vCheck = checkVoice(message);
    if (!vCheck.ok) return message.reply(vCheck.reason);

    const queue = useQueue(message.guild.id);
    if (!queue || !queue.isPlaying() || !queue.currentTrack) {
      return message.reply('❌ Không có bài hát nào đang phát!');
    }

    const guildId = message.guild.id;
    const userId = message.author.id;
    const vc = vCheck.voiceChannel;

    const listeners = vc.members.filter(m => !m.user.bot).size;
    if (listeners <= 1) {
      const title = queue.currentTrack.title;
      queue.node.skip();
      return message.reply(`⏭️ Chỉ có bạn trong phòng! Đã bỏ qua **${title}**`);
    }

    let votes = voteSkips.get(guildId);
    if (!votes) {
      votes = new Set();
      voteSkips.set(guildId, votes);
    }

    if (votes.has(userId)) {
      return message.reply('❌ Bạn đã bỏ phiếu rồi!');
    }

    votes.add(userId);
    const needed = Math.ceil(listeners / 2);

    if (votes.size >= needed) {
      const title = queue.currentTrack.title;
      const count = votes.size;
      votes.clear();
      queue.node.skip();
      return message.reply(`✅ Đủ **${count}/${needed}** phiếu! Đã bỏ qua **${title}**`);
    }

    return message.reply(`👥 **${message.author.username}** đã bỏ phiếu skip! (**${votes.size}/${needed}** phiếu cần thiết)`);
  },
};
