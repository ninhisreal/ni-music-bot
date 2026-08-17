import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { config } from '../../config.js';
import { baseEmbed } from '../../embeds/builder.js';
import { logger } from '../../utils/logger.js';

/**
 * High-Speed Multi-Source Lyrics Engine v2.0.
 *
 * Sources:
 * 1. LRCLIB (Direct Synced & Plain Database — High coverage for V-Pop, K-Pop, US-UK, EDM).
 * 2. LRCLIB Fuzzy Search (Fallback for formatted titles).
 * 3. Genius API & Clean HTML Scraper (Global hip-hop/pop).
 * 4. Lyrics.ovh API (Public international lyrics archive).
 *
 * @param {string} title
 * @param {string} artist
 * @returns {Promise<{ title: string, artist?: string, lyrics: string, source: string, thumbnail?: string, url?: string } | null>}
 */
export async function fetchLyrics(title, artist = '') {
  if (!title) return null;

  // 1. Clean Title and Artist from video clutter
  const cleanTitle = title
    .replace(/\((Official|Music Video|Audio|Lyric|MV|Video|Visualizer|Fashion|Performance)[^)]*\)/gi, '')
    .replace(/\[(Official|Music Video|Audio|Lyric|MV|Video|Visualizer|Fashion|Performance)[^\]]*\]/gi, '')
    .replace(/ft\..*$/i, '')
    .replace(/feat\..*$/i, '')
    .replace(/\|.*$/g, '')
    .replace(/-\s*Topic/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanArtist = (artist || '')
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/Official\s*Channel/i, '')
    .replace(/VEVO$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const searchAttempts = [
    { track: cleanTitle, artist: cleanArtist },
    { track: cleanTitle, artist: '' },
    { track: title.split(/[-–|]/)[0]?.trim() || cleanTitle, artist: title.split(/[-–|]/)[1]?.trim() || cleanArtist },
  ];

  // ─── Source 1: LRCLIB (Direct & Search) ──────────────────────────────
  for (const q of searchAttempts) {
    if (!q.track) continue;

    // 1a. Exact Get
    try {
      const p = new URLSearchParams({ track_name: q.track });
      if (q.artist) p.set('artist_name', q.artist);

      const res = await fetch(`https://lrclib.net/api/get?${p.toString()}`, {
        headers: { 'User-Agent': 'NiMusicBot/2.0 (Discord Bot)' },
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const d = await res.json();
        const text = d.plainLyrics || (d.syncedLyrics ? d.syncedLyrics.replace(/\[\d+:\d+\.\d+\]\s*/g, '') : null);
        if (text?.trim()) {
          logger.info('Lyrics', `✓ Found via LRCLIB Direct: "${d.trackName}" by "${d.artistName}"`);
          return {
            title: d.trackName,
            artist: d.artistName,
            lyrics: text.trim(),
            source: 'LRCLIB (Synced/Plain)',
          };
        }
      }
    } catch {}

    // 1b. Fuzzy Search
    try {
      const queryStr = `${q.track} ${q.artist}`.trim();
      const sRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(queryStr)}`, {
        headers: { 'User-Agent': 'NiMusicBot/2.0 (Discord Bot)' },
        signal: AbortSignal.timeout(3000),
      });

      if (sRes.ok) {
        const list = await sRes.json();
        if (Array.isArray(list) && list.length > 0) {
          const d = list[0];
          const text = d.plainLyrics || (d.syncedLyrics ? d.syncedLyrics.replace(/\[\d+:\d+\.\d+\]\s*/g, '') : null);
          if (text?.trim()) {
            logger.info('Lyrics', `✓ Found via LRCLIB Search: "${d.trackName}" by "${d.artistName}"`);
            return {
              title: d.trackName,
              artist: d.artistName,
              lyrics: text.trim(),
              source: 'LRCLIB (Global)',
            };
          }
        }
      }
    } catch {}
  }

  // ─── Source 2: Genius API & Scraper ─────────────────────────────────
  try {
    const geniusQuery = `${cleanTitle} ${cleanArtist}`.trim();
    const token = config.geniusToken;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const gRes = await fetch(`https://api.genius.com/search?q=${encodeURIComponent(geniusQuery)}`, {
      headers,
      signal: AbortSignal.timeout(3500),
    });

    if (gRes.ok) {
      const gData = await gRes.json();
      const hits = gData.response?.hits;
      if (hits?.length) {
        const song = hits[0].result;
        const pageRes = await fetch(song.url, { signal: AbortSignal.timeout(3500) });
        if (pageRes.ok) {
          const html = await pageRes.text();
          let lyrics = '';
          const regex = /data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/gi;
          let match;
          while ((match = regex.exec(html)) !== null) {
            lyrics += match[1];
          }

          if (!lyrics) {
            const fallbackMatch = html.match(/<div class="lyrics">([\s\S]*?)<\/div>/i);
            if (fallbackMatch) lyrics = fallbackMatch[1];
          }

          if (lyrics) {
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

            if (lyrics) {
              logger.info('Lyrics', `✓ Found via Genius: "${song.full_title}"`);
              return {
                title: song.title,
                artist: song.primary_artist?.name,
                lyrics,
                source: 'Genius',
                thumbnail: song.song_art_image_thumbnail_url,
                url: song.url,
              };
            }
          }
        }
      }
    }
  } catch {}

  // ─── Source 3: Lyrics.ovh API ───────────────────────────────────────
  try {
    const ovhArtist = encodeURIComponent(cleanArtist || 'Various');
    const ovhTitle = encodeURIComponent(cleanTitle);
    const ovhRes = await fetch(`https://api.lyrics.ovh/v1/${ovhArtist}/${ovhTitle}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (ovhRes.ok) {
      const ovhData = await ovhRes.json();
      if (ovhData.lyrics?.trim()) {
        logger.info('Lyrics', `✓ Found via Lyrics.ovh: "${cleanTitle}"`);
        return {
          title: cleanTitle,
          artist: cleanArtist,
          lyrics: ovhData.lyrics.trim(),
          source: 'Lyrics.ovh',
        };
      }
    }
  } catch {}

  return null;
}

export default {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Tìm và hiển thị lời bài hát đang phát hoặc theo tên (Đa nguồn: LRCLIB, Genius, Lyrics.ovh)')
    .addStringOption(opt =>
      opt.setName('song').setDescription('Tên bài hát (để trống = bài đang phát)')
    ),
  aliases: ['ly', 'lyric', 'loibaihat'],

  async execute(interaction) {
    await interaction.deferReply();
    let title = interaction.options.getString('song');
    let artist = '';
    let thumbnail = null;

    if (!title) {
      const queue = useQueue(interaction.guild.id);
      if (!queue?.isPlaying() || !queue.currentTrack) {
        return interaction.editReply('❌ Không có bài hát nào đang phát! Hãy nhập tên bài hát: `/lyrics song: Tên bài`');
      }
      title = queue.currentTrack.title;
      artist = queue.currentTrack.author || '';
      thumbnail = queue.currentTrack.thumbnail || null;
    }

    try {
      const result = await fetchLyrics(title, artist);

      if (!result || !result.lyrics) {
        return interaction.editReply(`❌ Không tìm thấy lời bài hát cho: **${title}**`);
      }

      const displayTitle = result.artist ? `${result.title} — ${result.artist}` : result.title;
      const truncated = result.lyrics.length > 3900
        ? result.lyrics.slice(0, 3900) + '\n\n*(Lời bài hát quá dài, đã rút gọn...)*'
        : result.lyrics;

      const embed = baseEmbed({
        title: `📜 Lời bài hát: ${displayTitle}`,
        description: truncated,
        url: result.url || undefined,
        thumbnail: result.thumbnail || thumbnail,
        footer: { text: `Nguồn: ${result.source} • Ni Music Studio Engine` },
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error('Lyrics', err.message);
      return interaction.editReply(`❌ Lỗi khi tải lời bài hát: ${err.message}`);
    }
  },

  async executePrefix(message, args) {
    let title = args.join(' ');
    let artist = '';
    let thumbnail = null;

    if (!title) {
      const queue = useQueue(message.guild.id);
      if (!queue?.isPlaying() || !queue.currentTrack) {
        return message.reply('❌ Không có bài đang phát! Nhập tên bài: `ni!ly Lạc Trôi` hoặc `ni!ly Shape of You`');
      }
      title = queue.currentTrack.title;
      artist = queue.currentTrack.author || '';
      thumbnail = queue.currentTrack.thumbnail || null;
    }

    const msg = await message.reply(`🔍 Đang tìm lời cho **${title}** từ kho dữ liệu đa nguồn...`);

    try {
      const result = await fetchLyrics(title, artist);

      if (!result || !result.lyrics) {
        return msg.edit(`❌ Không tìm thấy lời bài hát cho: **${title}**`);
      }

      const displayTitle = result.artist ? `${result.title} — ${result.artist}` : result.title;
      const truncated = result.lyrics.length > 3900
        ? result.lyrics.slice(0, 3900) + '\n\n*(Lời bài hát quá dài, đã rút gọn...)*'
        : result.lyrics;

      const embed = baseEmbed({
        title: `📜 Lời bài hát: ${displayTitle}`,
        description: truncated,
        url: result.url || undefined,
        thumbnail: result.thumbnail || thumbnail,
        footer: { text: `Nguồn: ${result.source} • Ni Music Studio Engine` },
      });

      return msg.edit({ content: '', embeds: [embed] });
    } catch (err) {
      logger.error('Lyrics', err.message);
      return msg.edit(`❌ Lỗi khi tải lời bài hát: ${err.message}`);
    }
  },
};
