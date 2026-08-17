import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { setLanguage, getSettings } from '../../database/models/settings.js';

export default {
  data: new SlashCommandBuilder()
    .setName('language')
    .setDescription('Đổi ngôn ngữ phản hồi của bot cho server này (Tiếng Việt / English)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('lang')
        .setDescription('Ngôn ngữ muốn chọn')
        .setRequired(true)
        .addChoices(
          { name: '🇻🇳 Tiếng Việt (Vietnamese)', value: 'vi' },
          { name: '🇬🇧 English (Tiếng Anh)', value: 'en' }
        )
    ),
  aliases: ['lang'],

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Bạn cần quyền Administrator để thay đổi ngôn ngữ bot!', ephemeral: true });
    }

    const lang = interaction.options.getString('lang');
    setLanguage(interaction.guild.id, lang);

    if (lang === 'vi') {
      return interaction.reply('🌐 Đã đổi ngôn ngữ bot thành **Tiếng Việt**!');
    } else {
      return interaction.reply('🌐 Bot language has been changed to **English**!');
    }
  },

  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Bạn cần quyền Administrator để thay đổi ngôn ngữ bot!');
    }

    const lang = (args[0] || '').toLowerCase();
    if (lang !== 'vi' && lang !== 'en') {
      const current = getSettings(message.guild.id).language;
      return message.reply(`🌐 Ngôn ngữ hiện tại: **${current.toUpperCase()}**\nCú pháp: \`ni!language vi\` hoặc \`ni!language en\``);
    }

    setLanguage(message.guild.id, lang);
    if (lang === 'vi') {
      return message.reply('🌐 Đã đổi ngôn ngữ bot thành **Tiếng Việt**!');
    } else {
      return message.reply('🌐 Bot language has been changed to **English**!');
    }
  },
};
