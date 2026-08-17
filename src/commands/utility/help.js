import { SlashCommandBuilder } from 'discord.js';
import { buildHelpEmbed, buildHelpSelectRow } from '../../embeds/misc-embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Hiển thị hướng dẫn và danh sách tất cả các lệnh của bot'),
  aliases: ['h', 'commands'],

  async execute(interaction) {
    const embed = buildHelpEmbed('all');
    const row = buildHelpSelectRow('all');

    const response = await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });

    const collector = response.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 120000,
    });

    collector.on('collect', async (i) => {
      if (i.customId === 'select_help_category') {
        const category = i.values[0];
        const newEmbed = buildHelpEmbed(category);
        const newRow = buildHelpSelectRow(category);
        await i.update({ embeds: [newEmbed], components: [newRow] });
      }
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },

  async executePrefix(message) {
    const embed = buildHelpEmbed('all');
    const row = buildHelpSelectRow('all');

    const msg = await message.reply({
      embeds: [embed],
      components: [row],
    });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 120000,
    });

    collector.on('collect', async (i) => {
      if (i.customId === 'select_help_category') {
        const category = i.values[0];
        const newEmbed = buildHelpEmbed(category);
        const newRow = buildHelpSelectRow(category);
        await i.update({ embeds: [newEmbed], components: [newRow] });
      }
    });

    collector.on('end', () => {
      msg.edit({ components: [] }).catch(() => {});
    });
  },
};
