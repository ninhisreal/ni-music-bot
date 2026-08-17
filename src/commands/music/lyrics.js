import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { config } from '../../config.js';
import { baseEmbed } from '../../embeds/builder.js';
import { logger } from '../../utils/logger.js';

/**
 * Lightweight Genius lyrics fetcher using native fetch().
 * Replaces the heavy genius-lyrics npm package (~15 sub-dependencies).
 */
export async function fetchLyrics(title) {
  const token = config.geniusToken;
  const searchUrl = `https://api.genius.com/search?q=${encodeURIComponent(title)}`;
  const headers = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  // 1. Search for the song
  const searchRes = await fetch(searchUrl, { headers });
  if (!searchRes.ok) return null;

  const searchData = await searchRes.json();
  const hits = searchData.response?.hits;
  if (!hits?.length) return null;

  const song = hits[0].result;

  // 2. Scrape lyrics from Genius page (lightweight HTML parsing)
  const pageRes = await fetch(song.url);
  if (!pageRes.ok) return { title: song.full_title, url: song.url, thumbnail: song.song_art_image_thumbnail_url, lyrics: null };

  const html = await pageRes.text();

  // Extract lyrics from Genius HTML (between data-lyrics-container divs)
  let lyrics = '';
  const regex = /data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    lyrics += match[1];
  }

  if (!lyrics) {
    // Fallback: try older Genius page format
    const fallbackMatch = html.match(/<div class="lyrics">([\s\S]*?)<\/div>/i);
    if (fallbackMatch) lyrics = fallbackMatch[1];
  }

  // Clean HTML tags
  lyrics = lyrics
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    title: song.full_title,
    url: song.url,
    thumbnail: song.song_art_image_thumbnail_url,
    lyrics: lyrics || null,
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Tìm và hiển thị lời bài hát đang phát hoặc theo tên')
    .addStringOption(opt =>
      opt.setName('song').setDescription('Tên bài hát (để trống = bài đang phát)')
    ),
  aliases: ['ly'],

  async execute(interaction) {
    await interaction.deferReply();
    let title = interaction.options.getString('song');

    if (!title) {
      const queue = useQueue(interaction.guild.id);
      if (!queue?.isPlaying() || !queue.currentTrack) {
        return interaction.editReply('❌ Không có bài hát đang phát!');
      }
      title = queue.currentTrack.title;
    }

    try {
      const cleanTitle = title.replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim();
      const result = await fetchLyrics(cleanTitle);

      if (!result || !result.lyrics) {
        return interaction.editReply(`❌ Không tìm thấy lời cho **${title}**`);
      }

      const truncated = result.lyrics.length > 3900
        ? result.lyrics.slice(0, 3900) + '...'
        : result.lyrics;

      const embed = baseEmbed({
        title: `🎵 ${result.title}`,
        description: truncated,
        url: result.url,
        thumbnail: result.thumbnail,
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error('Lyrics', err.message);
      return interaction.editReply(`❌ Lỗi: ${err.message}`);
    }
  },

  async executePrefix(message, args) {
    let title = args.join(' ');

    if (!title) {
      const queue = useQueue(message.guild.id);
      if (!queue?.isPlaying() || !queue.currentTrack) {
        return message.reply('❌ Không có bài đang phát! VD: `ni!ly Lạc Trôi`');
      }
      title = queue.currentTrack.title;
    }

    const msg = await message.reply(`⏳ Đang tìm lời **${title}**...`);

    try {
      const cleanTitle = title.replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim();
      const result = await fetchLyrics(cleanTitle);

      if (!result || !result.lyrics) {
        return msg.edit(`❌ Không tìm thấy lời cho **${title}**`);
      }

      const truncated = result.lyrics.length > 3900
        ? result.lyrics.slice(0, 3900) + '...'
        : result.lyrics;

      const embed = baseEmbed({
        title: `🎵 ${result.title}`,
        description: truncated,
        url: result.url,
        thumbnail: result.thumbnail,
      });

      return msg.edit({ content: '', embeds: [embed] });
    } catch (err) {
      logger.error('Lyrics', err.message);
      return msg.edit(`❌ Lỗi: ${err.message}`);
    }
  },
};
