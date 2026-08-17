import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Kiểm tra độ trễ (latency) của bot và kết nối Discord API'),
  aliases: ['latency'],

  async execute(interaction) {
    const sent = await interaction.reply({ content: '🏓 Đang kiểm tra độ trễ...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiPing = Math.round(interaction.client.ws.ping);

    return interaction.editReply(`🏓 **Pong!**\n⏱️ Độ trễ Bot: **${latency}ms**\n🌐 Discord WebSocket: **${apiPing}ms**`);
  },

  async executePrefix(message) {
    const sent = await message.reply('🏓 Đang kiểm tra độ trễ...');
    const latency = sent.createdTimestamp - message.createdTimestamp;
    const apiPing = Math.round(message.client.ws.ping);

    return sent.edit(`🏓 **Pong!**\n⏱️ Độ trễ Bot: **${latency}ms**\n🌐 Discord WebSocket: **${apiPing}ms**`);
  },
};
