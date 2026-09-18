import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { EMOJI, LOOP_MODE } from '../utils/constants.js';
import { getSettings } from '../database/models/settings.js';

/**
 * Build Row 1 of player controls:
 * [⏮️ Prev] [⏯️ Pause/Resume] [⏭️ Skip] [⏹️ Stop] [🔁 Loop]
 */
export function buildPlayerControlsRow(queue) {
  const isPaused = typeof queue?.node?.isPaused === 'function' ? queue.node.isPaused() : false;
  const loopMode = queue?.repeatMode ?? LOOP_MODE.NONE;

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
 * [📜 Lời bài hát] [🎛️ Audio FX] [🤖 Auto-DJ] [📤 Lấy mã code]
 */
export function buildPlayerControlsRow3(queue = null) {
  let isAutoDj = false;
  if (queue?.guild?.id) {
    try {
      const settings = getSettings(queue.guild.id);
      isAutoDj = Boolean(settings.auto_dj_enabled);
    } catch {}
  }

  const lyricsBtn = new ButtonBuilder()
    .setCustomId('player_lyrics')
    .setEmoji(EMOJI.LYRICS)
    .setLabel('Lời bài hát')
    .setStyle(ButtonStyle.Secondary);

  const filterBtn = new ButtonBuilder()
    .setCustomId('player_filters_menu')
    .setEmoji(EMOJI.FILTERS)
    .setLabel('Audio FX')
    .setStyle(ButtonStyle.Secondary);

  const autoDjBtn = new ButtonBuilder()
    .setCustomId('player_autodj')
    .setEmoji('🤖')
    .setLabel(isAutoDj ? 'Auto-DJ: Bật' : 'Auto-DJ: Tắt')
    .setStyle(isAutoDj ? ButtonStyle.Success : ButtonStyle.Secondary);

  const exportBtn = new ButtonBuilder()
    .setCustomId('player_export_code')
    .setEmoji(EMOJI.EXPORT)
    .setLabel('Lấy mã code')
    .setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder().addComponents(lyricsBtn, filterBtn, autoDjBtn, exportBtn);
}

/**
 * Build Mini ActionRow for instant playback controls on track add.
 * [⏯️ Phát/Dừng] [⏭️ Bỏ qua] [📋 Hàng đợi]
 */
export function buildMiniControlsRow() {
  const pauseBtn = new ButtonBuilder()
    .setCustomId('player_pause_resume')
    .setEmoji('⏯️')
    .setLabel('Phát/Dừng')
    .setStyle(ButtonStyle.Primary);

  const skipBtn = new ButtonBuilder()
    .setCustomId('player_skip')
    .setEmoji(EMOJI.SKIP)
    .setLabel('Bỏ qua')
    .setStyle(ButtonStyle.Secondary);

  const queueBtn = new ButtonBuilder()
    .setCustomId('player_queue')
    .setEmoji(EMOJI.QUEUE)
    .setLabel('Hàng đợi')
    .setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder().addComponents(pauseBtn, skipBtn, queueBtn);
}
