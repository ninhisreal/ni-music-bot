import { SlashCommandBuilder } from 'discord.js';
import { getPlaylistByName, exportPlaylistCode } from '../../database/models/playlist.js';
import { isUserPremium, isGuildPremium } from '../../database/models/premium.js';
import { baseEmbed } from '../../embeds/builder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('playlist-share')
    .setDescription('Chia sẻ công khai playlist của bạn dưới dạng Embed đẹp mắt')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Tên playlist muốn chia sẻ')
        .setRequired(true)
    ),
  aliases: ['pl-share', 'plshare'],

  async execute(interaction) {
    const name = interaction.options.getString('name').trim();
    const userId = interaction.user.id;
    const pl = getPlaylistByName(userId, name);

    if (!pl) {
      return interaction.reply({ content: `❌ Không tìm thấy playlist tên **${name}**!`, ephemeral: true });
    }

    const isPrem = isUserPremium(userId) || isGuildPremium(interaction.guild.id);
    const code = exportPlaylistCode(pl.id, userId, isPrem);

    const embed = baseEmbed({
      title: `🎵 ${interaction.user.username} đã chia sẻ Playlist: "${name}"`,
      description:
        `Để nghe lại danh sách bài hát này, hãy dùng lệnh:\n` +
        `\`\`\`\n/playlist-import ${code}\n\`\`\`\n` +
        `Hoặc: \`ni!plimport ${code}\``,
      footer: `Mã code: ${code} • 🎵 Ni Music Bot`,
    });

    return interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    if (!args.length) {
      return message.reply('❌ Vui lòng nhập tên playlist muốn chia sẻ! Ví dụ: `ni!plshare MyFavorites`');
    }

    const name = args.join(' ').trim();
    const userId = message.author.id;
    const pl = getPlaylistByName(userId, name);

    if (!pl) {
      return message.reply(`❌ Không tìm thấy playlist tên **${name}**!`);
    }

    const isPrem = isUserPremium(userId) || isGuildPremium(message.guild.id);
    const code = exportPlaylistCode(pl.id, userId, isPrem);

    const embed = baseEmbed({
      title: `🎵 ${message.author.username} đã chia sẻ Playlist: "${name}"`,
      description:
        `Để nghe lại danh sách bài hát này, hãy dùng lệnh:\n` +
        `\`\`\`\nni!plimport ${code}\n\`\`\``,
      footer: `Mã code: ${code} • 🎵 Ni Music Bot`,
    });

    return message.reply({ embeds: [embed] });
  },
};
