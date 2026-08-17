import { SlashCommandBuilder, OAuth2Scopes, PermissionFlagsBits } from 'discord.js';
import { baseEmbed } from '../../embeds/builder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Lấy liên kết mời bot vào các server khác của bạn'),
  aliases: ['inv'],

  async execute(interaction) {
    const inviteUrl = interaction.client.generateInvite({
      scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
      permissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.UseExternalEmojis,
      ],
    });

    const embed = baseEmbed({
      title: '🔗 Mời Ni Music Bot',
      description: `Nhấn vào link dưới đây để mời bot tham gia server của bạn:\n\n[**👉 Bấm vào đây để mời Bot**](${inviteUrl})`,
    });

    return interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    const inviteUrl = message.client.generateInvite({
      scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
      permissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.UseExternalEmojis,
      ],
    });

    const embed = baseEmbed({
      title: '🔗 Mời Ni Music Bot',
      description: `Nhấn vào link dưới đây để mời bot tham gia server của bạn:\n\n[**👉 Bấm vào đây để mời Bot**](${inviteUrl})`,
    });

    return message.reply({ embeds: [embed] });
  },
};
