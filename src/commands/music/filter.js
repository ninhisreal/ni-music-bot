import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { checkVoice, checkDjRole } from '../../guards/role-check.js';
import { getFilter, listFilters, applyFilter } from '../../player/filters.js';
import { buildFilterSelectRow } from '../../buttons/filter-select.js';

export default {
  data: new SlashCommandBuilder()
    .setName('filter')
    .setDescription('Áp dụng hiệu ứng âm thanh (Audio Filter) cho bài nhạc')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Tên filter cần áp dụng (để trống để mở menu chọn)')
    ),
  aliases: ['fx', 'effects', 'eq'],

  async execute(interaction) {
    const vCheck = checkVoice(interaction);
    if (!vCheck.ok) return interaction.reply({ content: vCheck.reason, ephemeral: true });

    const dj = checkDjRole(interaction);
    if (!dj.ok) return interaction.reply({ content: dj.reason, ephemeral: true });

    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.isPlaying()) {
      return interaction.reply({ content: '❌ Không có bài hát nào đang phát!', ephemeral: true });
    }

    const filterName = interaction.options.getString('name');
    if (!filterName) {
      const row = buildFilterSelectRow(null);
      return interaction.reply({
        content: '🎛️ **Chọn Audio Filter từ danh sách:**',
        components: [row],
      });
    }

    if (filterName.toLowerCase() === 'off' || filterName.toLowerCase() === 'clear') {
      await applyFilter(queue, 'off');
      return interaction.reply('🎛️ Đã tắt tất cả audio filters!');
    }

    const f = getFilter(filterName);
    if (!f) {
      const available = listFilters().map(x => `\`${x.key}\``).join(', ');
      return interaction.reply({
        content: `❌ Filter **${filterName}** không tồn tại!\nCác filter có sẵn: ${available}`,
        ephemeral: true,
      });
    }

    await applyFilter(queue, f.key);
    return interaction.reply(`🎛️ Đã kích hoạt filter: **${f.name}** ${f.emoji}`);
  },

  async executePrefix(message, args) {
    const vCheck = checkVoice(message);
    if (!vCheck.ok) return message.reply(vCheck.reason);

    const dj = checkDjRole(message);
    if (!dj.ok) return message.reply(dj.reason);

    const queue = useQueue(message.guild.id);
    if (!queue || !queue.isPlaying()) {
      return message.reply('❌ Không có bài hát nào đang phát!');
    }

    const filterName = args[0];
    if (!filterName) {
      const row = buildFilterSelectRow(null);
      return message.reply({
        content: '🎛️ **Chọn Audio Filter từ danh sách:**',
        components: [row],
      });
    }

    if (filterName.toLowerCase() === 'off' || filterName.toLowerCase() === 'clear') {
      await applyFilter(queue, 'off');
      return message.reply('🎛️ Đã tắt tất cả audio filters!');
    }

    const f = getFilter(filterName);
    if (!f) {
      const available = listFilters().map(x => `\`${x.key}\``).join(', ');
      return message.reply(`❌ Filter **${filterName}** không tồn tại!\nCác filter có sẵn: ${available}`);
    }

    await applyFilter(queue, f.key);
    return message.reply(`🎛️ Đã kích hoạt filter: **${f.name}** ${f.emoji}`);
  },
};
