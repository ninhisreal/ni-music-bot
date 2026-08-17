import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

/**
 * Build a select menu for search results.
 * @param {import('discord-player').Track[]} tracks
 */
export function buildSearchSelectRow(tracks) {
  const select = new StringSelectMenuBuilder()
    .setCustomId('select_search_track')
    .setPlaceholder('🎵 Chọn bài hát bạn muốn phát...');

  tracks.slice(0, 10).forEach((t, i) => {
    const title = t.title.length > 80 ? t.title.slice(0, 77) + '...' : t.title;
    const author = (t.author || 'Unknown').slice(0, 50);
    const sourceEmoji = t.source === 'deezer' ? '💜' : t.source === 'spotify' ? '🟢' : t.source === 'applemusic' ? '🎵' : t.source === 'youtube' ? '▶️' : '🟠';
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(`${i + 1}. ${title}`)
        .setDescription(`${sourceEmoji} ${author} | ⏱️ ${t.duration}`)
        .setValue(String(i))
    );
  });

  return new ActionRowBuilder().addComponents(select);
}

/**
 * Build interactive platform selection buttons row in the exact priority order:
 * [💜 Deezer] [🟢 Spotify] [🎵 Apple Music] [▶️ YouTube] [🟠 SoundCloud]
 *
 * @param {'auto'|'deezer'|'spotify'|'applemusic'|'youtube'|'soundcloud'} activePlatform
 */
export function buildPlatformSelectRow(activePlatform = 'auto') {
  const dzBtn = new ButtonBuilder()
    .setCustomId('search_platform_deezer')
    .setLabel('Deezer')
    .setEmoji('💜')
    .setStyle(activePlatform === 'deezer' ? ButtonStyle.Primary : ButtonStyle.Secondary);

  const spBtn = new ButtonBuilder()
    .setCustomId('search_platform_spotify')
    .setLabel('Spotify')
    .setEmoji('🟢')
    .setStyle(activePlatform === 'spotify' ? ButtonStyle.Success : ButtonStyle.Secondary);

  const amBtn = new ButtonBuilder()
    .setCustomId('search_platform_applemusic')
    .setLabel('Apple Music')
    .setEmoji('🎵')
    .setStyle(activePlatform === 'applemusic' ? ButtonStyle.Primary : ButtonStyle.Secondary);

  const ytBtn = new ButtonBuilder()
    .setCustomId('search_platform_youtube')
    .setLabel('YouTube')
    .setEmoji('▶️')
    .setStyle(activePlatform === 'youtube' ? ButtonStyle.Danger : ButtonStyle.Secondary);

  const scBtn = new ButtonBuilder()
    .setCustomId('search_platform_soundcloud')
    .setLabel('SoundCloud')
    .setEmoji('🟠')
    .setStyle(activePlatform === 'soundcloud' ? ButtonStyle.Primary : ButtonStyle.Secondary);

  return new ActionRowBuilder().addComponents(dzBtn, spBtn, amBtn, ytBtn, scBtn);
}
