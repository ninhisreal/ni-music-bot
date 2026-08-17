import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { checkVoice, checkDjRole } from '../../guards/role-check.js';
import { LOOP_MODE, LOOP_LABELS } from '../../utils/constants.js';

export default {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Cài đặt chế độ lặp lại phát nhạc')
    .addIntegerOption(opt =>
      opt.setName('mode')
        .setDescription('Chế độ lặp')
        .setRequired(true)
        .addChoices(
          { name: 'Tắt lặp (Off)', value: LOOP_MODE.NONE },
          { name: 'Lặp lại bài hát hiện tại (Track)', value: LOOP_MODE.TRACK },
          { name: 'Lặp lại toàn bộ hàng đợi (Queue)', value: LOOP_MODE.QUEUE }
        )
    ),
  aliases: ['repeat'],

  async execute(interaction) {
    const vCheck = checkVoice(interaction);
    if (!vCheck.ok) return interaction.reply({ content: vCheck.reason, ephemeral: true });

    const dj = checkDjRole(interaction);
    if (!dj.ok) return interaction.reply({ content: dj.reason, ephemeral: true });

    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.isPlaying()) {
      return interaction.reply({ content: '❌ Không có bài hát nào đang phát!', ephemeral: true });
    }

    const mode = interaction.options.getInteger('mode');
    queue.setRepeatMode(mode);

    return interaction.reply(`🔁 Chế độ lặp: **${LOOP_LABELS[mode]}**`);
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

    const arg = (args[0] || '').toLowerCase();
    let mode;
    if (arg === 'track' || arg === 'song' || arg === '1') mode = LOOP_MODE.TRACK;
    else if (arg === 'queue' || arg === 'all' || arg === 'q') mode = LOOP_MODE.QUEUE;
    else if (arg === 'off' || arg === '0') mode = LOOP_MODE.NONE;
    else {
      // Toggle
      if (queue.repeatMode === LOOP_MODE.NONE) mode = LOOP_MODE.TRACK;
      else if (queue.repeatMode === LOOP_MODE.TRACK) mode = LOOP_MODE.QUEUE;
      else mode = LOOP_MODE.NONE;
    }

    queue.setRepeatMode(mode);
    return message.reply(`🔁 Chế độ lặp: **${LOOP_LABELS[mode]}**`);
  },
};
