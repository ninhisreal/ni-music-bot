import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { checkVoice, checkDjRole } from '../../guards/role-check.js';

export default {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Xóa một bài hát khỏi hàng đợi theo số thứ tự')
    .addIntegerOption(opt =>
      opt.setName('index')
        .setDescription('Vị trí bài hát trong hàng đợi (bắt đầu từ 1)')
        .setMinValue(1)
        .setRequired(true)
    ),
  aliases: ['rm', 'del'],

  async execute(interaction) {
    const vCheck = checkVoice(interaction);
    if (!vCheck.ok) return interaction.reply({ content: vCheck.reason, ephemeral: true });

    const dj = checkDjRole(interaction);
    if (!dj.ok) return interaction.reply({ content: dj.reason, ephemeral: true });

    const queue = useQueue(interaction.guild.id);
    if (!queue || queue.tracks.size === 0) {
      return interaction.reply({ content: '❌ Hàng đợi đang trống!', ephemeral: true });
    }

    const index = interaction.options.getInteger('index') - 1;
    const track = queue.tracks.toArray()[index];

    if (!track) {
      return interaction.reply({ content: `❌ Không tìm thấy bài hát ở vị trí ${index + 1}!`, ephemeral: true });
    }

    queue.node.remove(track);
    return interaction.reply(`🗑️ Đã xóa **${track.title}** khỏi hàng đợi.`);
  },

  async executePrefix(message, args) {
    const vCheck = checkVoice(message);
    if (!vCheck.ok) return message.reply(vCheck.reason);

    const dj = checkDjRole(message);
    if (!dj.ok) return message.reply(dj.reason);

    const queue = useQueue(message.guild.id);
    if (!queue || queue.tracks.size === 0) {
      return message.reply('❌ Hàng đợi đang trống!');
    }

    const index = (parseInt(args[0], 10) || 0) - 1;
    const track = queue.tracks.toArray()[index];

    if (!track) {
      return message.reply(`❌ Không tìm thấy bài hát ở vị trí ${index + 1}! Dùng: \`ni!remove <số thứ tự>\``);
    }

    queue.node.remove(track);
    return message.reply(`🗑️ Đã xóa **${track.title}** khỏi hàng đợi.`);
  },
};
