import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { EMOJI, LOOP_MODE } from '../utils/constants.js';

/**
 * Build Row 1 of player controls:
 * [⏮️ Prev] [⏯️ Pause/Resume] [⏭️ Skip] [⏹️ Stop] [🔁 Loop]
 */
export function buildPlayerControlsRow(queue) {
  const isPaused = queue.node.isPaused();
  const loopMode = queue.repeatMode;

  const prevBtn = new ButtonBuilder()
    .setCustomId('player_prev')
    .setEmoji(EMOJI.PREV)
    .setStyle(ButtonStyle.Secondary);

  const pauseBtn = new ButtonBuilder()
    .setCustomId('player_pause_resume')
    .setEmoji(isPaused ? EMOJI.PLAY : EMOJI.PAUSE)
    .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary);

  const skipBtn = new ButtonBuilder()
    .setCustomId('player_skip')
    .setEmoji(EMOJI.SKIP)
    .setStyle(ButtonStyle.Secondary);

  const stopBtn = new ButtonBuilder()
    .setCustomId('player_stop')
    .setEmoji(EMOJI.STOP)
    .setStyle(ButtonStyle.Danger);

  const loopStyle = loopMode === LOOP_MODE.NONE ? ButtonStyle.Secondary : ButtonStyle.Success;
  const loopBtn = new ButtonBuilder()
    .setCustomId('player_loop')
    .setEmoji(EMOJI.LOOP)
    .setStyle(loopStyle);

  return new ActionRowBuilder().addComponents(prevBtn, pauseBtn, skipBtn, stopBtn, loopBtn);
}

/**
 * Build Row 2 of player controls:
 * [🔀 Shuffle] [🔉 Vol-] [🔊 Vol+] [📋 Queue] [❤️ Save]
 */
export function buildPlayerControlsRow2() {
  const shuffleBtn = new ButtonBuilder()
    .setCustomId('player_shuffle')
    .setEmoji(EMOJI.SHUFFLE)
    .setStyle(ButtonStyle.Secondary);

  const volDownBtn = new ButtonBuilder()
    .setCustomId('player_voldown')
    .setEmoji(EMOJI.VOL_DOWN)
    .setStyle(ButtonStyle.Secondary);

  const volUpBtn = new ButtonBuilder()
    .setCustomId('player_volup')
    .setEmoji(EMOJI.VOL_UP)
    .setStyle(ButtonStyle.Secondary);

  const queueBtn = new ButtonBuilder()
    .setCustomId('player_queue')
    .setEmoji(EMOJI.QUEUE)
    .setStyle(ButtonStyle.Secondary);

  const saveBtn = new ButtonBuilder()
    .setCustomId('player_save')
    .setEmoji(EMOJI.SAVE)
    .setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder().addComponents(shuffleBtn, volDownBtn, volUpBtn, queueBtn, saveBtn);
}

/**
 * Build Row 3 of player controls:
 * [🎵 Lời bài hát] [🎛️ Filters] [📤 Lấy mã code]
 */
export function buildPlayerControlsRow3() {
  const lyricsBtn = new ButtonBuilder()
    .setCustomId('player_lyrics')
    .setEmoji(EMOJI.LYRICS)
    .setLabel('Lời bài hát')
    .setStyle(ButtonStyle.Secondary);

  const filterBtn = new ButtonBuilder()
    .setCustomId('player_filters_menu')
    .setEmoji(EMOJI.FILTERS)
    .setLabel('Filters')
    .setStyle(ButtonStyle.Secondary);

  const exportBtn = new ButtonBuilder()
    .setCustomId('player_export_code')
    .setEmoji(EMOJI.EXPORT)
    .setLabel('Lấy mã code')
    .setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder().addComponents(lyricsBtn, filterBtn, exportBtn);
}
