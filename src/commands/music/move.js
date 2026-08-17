import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { checkVoice, checkDjRole } from '../../guards/role-check.js';

export default {
  data: new SlashCommandBuilder()
    .setName('move')
    .setDescription('Di chuyển vị trí bài hát trong hàng đợi')
    .addIntegerOption(opt =>
      opt.setName('from')
        .setDescription('Vị trí hiện tại của bài hát')
        .setMinValue(1)
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('to')
        .setDescription('Vị trí mới muốn chuyển đến')
        .setMinValue(1)
        .setRequired(true)
    ),
  aliases: ['mv'],

  async execute(interaction) {
    const vCheck = checkVoice(interaction);
    if (!vCheck.ok) return interaction.reply({ content: vCheck.reason, ephemeral: true });

    const dj = checkDjRole(interaction);
    if (!dj.ok) return interaction.reply({ content: dj.reason, ephemeral: true });

    const queue = useQueue(interaction.guild.id);
    if (!queue || queue.tracks.size === 0) {
      return interaction.reply({ content: '❌ Hàng đợi đang trống!', ephemeral: true });
    }

    const from = interaction.options.getInteger('from') - 1;
    const to = interaction.options.getInteger('to') - 1;
    const tracks = queue.tracks.toArray();

    if (!tracks[from]) {
      return interaction.reply({ content: `❌ Không tìm thấy bài hát ở vị trí ${from + 1}!`, ephemeral: true });
    }

    const track = tracks[from];
    queue.node.move(track, to);

    return interaction.reply(`✅ Đã di chuyển **${track.title}** từ vị trí ${from + 1} → ${to + 1}!`);
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

    const from = (parseInt(args[0], 10) || 0) - 1;
    const to = (parseInt(args[1], 10) || 0) - 1;
    const tracks = queue.tracks.toArray();

    if (!tracks[from] || isNaN(to) || to < 0) {
      return message.reply('❌ Vui lòng nhập đúng cú pháp: `ni!move <vị trí cũ> <vị trí mới>`');
    }

    const track = tracks[from];
    queue.node.move(track, to);

    return message.reply(`✅ Đã di chuyển **${track.title}** từ vị trí ${from + 1} → ${to + 1}!`);
  },
};
