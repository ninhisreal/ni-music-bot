import { QueryType, Track } from 'discord-player';
import pkg from 'youtube-sr';
const YouTube = pkg.default || pkg;
import { logger } from '../utils/logger.js';
import { isAllowedMusicUrl } from '../utils/url-validator.js';

const YTM_ORIGIN = 'music.youtube.com';

// ─── LRU Search Cache (100 entries, 5-minute TTL) ───────────────────────
const CACHE_MAX = 100;
const CACHE_TTL = 5 * 60 * 1000;
const searchCache = new Map();

function getCached(key) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }
  return entry.tracks;
}

function setCache(key, tracks) {
  if (searchCache.size >= CACHE_MAX) {
    const oldest = searchCache.keys().next().value;
    searchCache.delete(oldest);
  }
  searchCache.set(key, { tracks, ts: Date.now() });
}

// ─── URL Utilities & Metadata Resolution ────────────────────────────────

export function isYoutubeMusicUrl(url) {
  try { return new URL(url).hostname === YTM_ORIGIN; } catch { return false; }
}

export function normalizeYoutubeMusicUrl(url) {
  if (!url || typeof url !== 'string') return url;
  try {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const u = new URL(url);
      const v = u.searchParams.get('v');
      const list = u.searchParams.get('list');
      if (v && list && (list.startsWith('RD') || list.startsWith('UL'))) {
        return `https://www.youtube.com/watch?v=${v}`;
      }
      if (u.hostname === YTM_ORIGIN && v) {
        return `https://www.youtube.com/watch?v=${v}`;
      }
    }
    return url;
  } catch { return url; }
}

export function detectSource(url) {
  if (!url) return 'unknown';
  if (url.includes('deezer.com'))       return 'deezer';
  if (url.includes('music.apple.com') || url.includes('itunes.apple.com')) return 'applemusic';
  if (url.includes('spotify.com'))      return 'spotify';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('napster.com'))      return 'napster';
  if (url.includes('jamendo.com'))      return 'jamendo';
  if (url.includes('soundcloud.com'))   return 'soundcloud';
  return 'unknown';
}

/**
 * Resolve title and artist from a YouTube URL using official public oEmbed API with timeout.
 */
export async function resolveYoutubeOEmbed(url) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.title) return null;

    const authorClean = (data.author_name || '')
      .replace(/\s*-\s*Topic$/i, '')
      .replace(/Official\s*Channel/i, '')
      .replace(/VEVO$/i, '')
      .trim();

    return {
      title: data.title,
      author: authorClean,
      searchQuery: authorClean ? `${data.title} ${authorClean}` : data.title,
      thumbnail: data.thumbnail_url || null,
    };
  } catch {
    return null;
  }
}

// ─── 8-Platform Search Connectors ───────────────────────────────────────

const MAX_RESULTS = 5;

// 1. Deezer
async function searchDeezer(player, query, options = {}) {
  try {
    const res = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${MAX_RESULTS}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map(t => new Track(player, {
      title: t.title,
      author: t.artist?.name || 'Unknown',
      url: t.link,
      duration: `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}`,
      thumbnail: t.album?.cover_medium,
      source: 'deezer',
      requestedBy: options.requestedBy,
    }));
  } catch { return []; }
}

// 2. Apple Music
async function searchAppleMusic(player, query, options = {}) {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${MAX_RESULTS}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map(t => new Track(player, {
      title: t.trackName,
      author: t.artistName,
      url: t.trackViewUrl,
      duration: `${Math.floor(t.trackTimeMillis / 60000)}:${String(Math.floor((t.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}`,
      thumbnail: t.artworkUrl100?.replace('100x100bb', '600x600bb'),
      source: 'applemusic',
      requestedBy: options.requestedBy,
    }));
  } catch { return []; }
}

// 3. Spotify
async function searchSpotify(player, query, options = {}) {
  try {
    const res = await player.search(query, { ...options, searchEngine: QueryType.SPOTIFY_SEARCH });
    return res.hasTracks() ? res.tracks.slice(0, MAX_RESULTS) : [];
  } catch { return []; }
}

// 4. YouTube
async function searchYouTube(player, query, options = {}) {
  try {
    const results = await YouTube.search(query, { limit: MAX_RESULTS, type: 'video' });
    return results.map(v => new Track(player, {
      title: v.title || 'YouTube Track',
      author: v.channel?.name || 'YouTube',
      url: `https://www.youtube.com/watch?v=${v.id}`,
      duration: v.durationFormatted || '0:00',
      thumbnail: v.thumbnail?.url,
      source: 'youtube',
      requestedBy: options.requestedBy,
    }));
  } catch { return []; }
}

// 5. Napster
async function searchNapster(player, query, options = {}) {
  try {
    const url = `https://api.napster.com/v2.2/search/verbose?query=${encodeURIComponent(query)}&type=track&per_type_limit=${MAX_RESULTS}&apikey=Y2M3NTU3NTEtMjI2Yi00MDM5LTlhMGQtYTNkZDQ2M2VhYjA2`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    const tracks = data.search?.data?.tracks || [];
    return tracks.map(t => new Track(player, {
      title: t.name,
      author: t.artistName,
      url: `https://app.napster.com/track/${t.id}`,
      duration: `${Math.floor(t.playbackSeconds / 60)}:${String(t.playbackSeconds % 60).padStart(2, '0')}`,
      thumbnail: `https://direct.rhapsody.com/imageserver/v2/albums/${t.albumId}/images/500x500.jpg`,
      source: 'napster',
      requestedBy: options.requestedBy,
    }));
  } catch { return []; }
}

// 6. Jamendo
async function searchJamendo(player, query, options = {}) {
  try {
    const url = `https://api.jamendo.com/v3.0/tracks/?client_id=56d30c95&format=json&limit=${MAX_RESULTS}&namesearch=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map(t => new Track(player, {
      title: t.name,
      author: t.artist_name,
      url: t.shareurl || t.audio,
      duration: `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}`,
      thumbnail: t.image,
      source: 'jamendo',
      requestedBy: options.requestedBy,
    }));
  } catch { return []; }
}

// 7. SoundCloud
async function searchSoundCloud(player, query, options = {}) {
  try {
    const res = await player.search(query, { ...options, searchEngine: QueryType.SOUNDCLOUD_SEARCH });
    if (!res.hasTracks()) return [];
    const full = res.tracks.filter(t => (t.durationMS || 0) > 45000);
    return (full.length ? full : res.tracks).slice(0, MAX_RESULTS);
  } catch { return []; }
}

// ─── Main 8-Platform Search Router ──────────────────────────────────────

const PLATFORM_MAP = {
  deezer: searchDeezer,
  applemusic: searchAppleMusic,
  spotify: searchSpotify,
  youtube: searchYouTube,
  napster: searchNapster,
  jamendo: searchJamendo,
  soundcloud: searchSoundCloud,
};

// Priority: YouTube > Spotify > Deezer > Apple Music > SoundCloud > Napster > Jamendo
const AUTO_ORDER = ['youtube', 'spotify', 'deezer', 'applemusic', 'soundcloud', 'napster', 'jamendo'];

/**
 * Unified 8-platform search with exact URL preservation and metadata extraction.
 *
 * @param {import('discord-player').Player} player
 * @param {string} query
 * @param {string} platform
 * @param {object} options
 * @returns {Promise<Track[]>}
 */
export async function searchByPlatform(player, query, platform = 'auto', options = {}) {
  const cleanQuery = normalizeYoutubeMusicUrl(query);
  const cacheKey = `${platform}:${cleanQuery}`;

  // 1. Check cache first
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // 2. Direct URL Handling
  if (cleanQuery.startsWith('http://') || cleanQuery.startsWith('https://')) {
    // SSRF / Allowlist check
    if (!isAllowedMusicUrl(cleanQuery)) {
      logger.warn('Search', `Rejected disallowed URL for SSRF security: ${cleanQuery}`);
      return [];
    }

    // 2a. YouTube URL -> Extract metadata cleanly via oEmbed and keep URL exact
    if (cleanQuery.includes('youtube.com') || cleanQuery.includes('youtu.be')) {
      const oembed = await resolveYoutubeOEmbed(cleanQuery);
      const metaTrack = new Track(player, {
        title: oembed?.title || 'YouTube Track',
        author: oembed?.author || 'YouTube',
        url: cleanQuery,
        thumbnail: oembed?.thumbnail || null,
        source: 'youtube',
        requestedBy: options.requestedBy,
      });
      setCache(cacheKey, [metaTrack]);
      return [metaTrack];
    }

    // 2b. Direct search for other URLs (Spotify, SoundCloud, etc.)
    try {
      const res = await player.search(cleanQuery, options);
      if (res.hasTracks()) {
        const tracks = res.tracks.slice(0, MAX_RESULTS);
        setCache(cacheKey, tracks);
        return tracks;
      }
    } catch (err) {
      logger.warn('Search', `Direct URL extraction notice for ${cleanQuery}: ${err.message}`);
    }

    return [];
  }

  // 3. Explicit platform text search
  if (platform !== 'auto' && PLATFORM_MAP[platform]) {
    const tracks = await PLATFORM_MAP[platform](player, cleanQuery, options);
    if (tracks.length) { setCache(cacheKey, tracks); return tracks; }
  }

  // 4. Auto Cascade: YouTube → Spotify → Deezer → Apple Music → SoundCloud
  if (platform === 'auto') {
    for (const p of AUTO_ORDER) {
      const tracks = await PLATFORM_MAP[p](player, cleanQuery, options);
      if (tracks.length) { setCache(`auto:${cleanQuery}`, tracks); return tracks; }
    }
  }

  return [];
}

/**
 * Strict Relevance Matching Helper to prevent false audio substitutions.
 * @param {string} candidateTitle
 * @param {string} targetTitle
 * @returns {boolean}
 */
export function isAccurateMatch(candidateTitle, targetTitle) {
  if (!candidateTitle || !targetTitle) return false;
  const normalize = (str) =>
    str
      .toLowerCase()
      .replace(/[\(\)\[\]\{\}\-_|•–—~`'"!?,.:;/\\+]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const c = normalize(candidateTitle);
  const t = normalize(targetTitle);

  const stopWords = new Set([
    'official', 'music', 'video', 'audio', 'lyric', 'lyrics', 'mv', 'hd', 'hq',
    'ep', 'lp', 'album', 'single', 'visualizer', 'fashion', 'performance',
    'the', 'and', 'a', 'an', 'in', 'on', 'of', 'for', 'to', 'with', 'by', 'ft', 'feat', 'prod'
  ]);

  const targetWords = t.split(' ').filter(w => w.length >= 2 && !stopWords.has(w));
  const candidateWords = new Set(c.split(' ').filter(w => w.length >= 2 && !stopWords.has(w)));

  if (!targetWords.length) return true;

  // Key distinctive words that distinguish versions/EPs/sub-tracks:
  const distinctKeywords = [
    'lunar', 'after', 'cold', 'deep', 'messe', 'nights', 'beijing', 'tokyo',
    'remix', 'slowed', 'reverb', 'acoustic', 'live', 'instrumental', 'club',
    'extended', 'radio', 'edit', 'vip', 'cover', 'sped', 'speed', 'drill'
  ];

  for (const kw of distinctKeywords) {
    const targetHas = targetWords.includes(kw);
    const candidateHas = candidateWords.has(kw);
    if (targetHas && !candidateHas) return false;
    if (!targetHas && candidateHas) return false;
  }

  let matchCount = 0;
  for (const w of targetWords) {
    if (candidateWords.has(w) || c.includes(w)) {
      matchCount++;
    }
  }

  const score = matchCount / targetWords.length;
  return score >= 0.7;
}

/**
 * Bridges non-streamable tracks (Spotify/Apple/Deezer) to a verified streamable audio source.
 * FOR DIRECT YOUTUBE OR SOUNDCLOUD URLS, PRESERVES THE EXACT URL (NO SOUNDCLOUD HIJACKING).
 *
 * @param {import('discord-player').Player} player
 * @param {import('discord-player').Track} track
 * @param {object} options
 * @returns {Promise<import('discord-player').Track>}
 */
export async function resolvePlayableTrack(player, track, options = {}) {
  if (!track) return null;

  const url = track.url || '';

  // 1. Direct YouTube / YouTube Music URL: return directly!
  // It will be streamed directly via onBeforeCreateStream (play-dl / ytdl).
  if (url.includes('youtube.com') || url.includes('youtu.be') || track.source === 'youtube') {
    return track;
  }

  // 2. Direct SoundCloud track: return directly!
  if (url.includes('soundcloud.com') || track.source === 'soundcloud') {
    return track;
  }

  // 3. Direct Attachment / Local: return directly!
  if (track.source === 'attachment') {
    return track;
  }

  // 4. Non-streamable sources (Spotify, Apple Music, Deezer):
  // Resolve to YouTube first using strict title and artist matching.
  const rawTitle = track.title || '';
  const cleanTitle = rawTitle
    .replace(/\((Official|Music Video|Audio|Lyric|MV|Video|Visualizer)[^)]*\)/gi, '')
    .replace(/\[(Official|Music Video|Audio|Lyric|MV|Video|Visualizer)[^\]]*\]/gi, '')
    .replace(/ft\..*$/i, '')
    .replace(/feat\..*$/i, '')
    .replace(/[|•]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let cleanAuthor = (track.author || '')
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/Official\s*Channel/i, '')
    .replace(/VEVO$/i, '')
    .replace(/YouTube/i, '')
    .trim();

  const searchQuery = cleanAuthor && !cleanTitle.toLowerCase().includes(cleanAuthor.toLowerCase())
    ? `${cleanTitle} ${cleanAuthor}`
    : cleanTitle;

  logger.info('Bridge', `Searching verified stream for: "${track.title}" - "${track.author}"...`);

  // Priority 1: Search on YouTube
  try {
    const ytTracks = await searchYouTube(player, searchQuery, options);
    const ytMatch = ytTracks.find(t => isAccurateMatch(t.title, cleanTitle));
    if (ytMatch) {
      if (track.thumbnail) ytMatch.thumbnail = track.thumbnail;
      logger.info('Bridge', `✓ Matched YouTube stream: "${ytMatch.title}" for "${track.title}"`);
      return ytMatch;
    }
  } catch {}

  // Priority 2: Search on SoundCloud with strict match
  try {
    const scTracks = await searchSoundCloud(player, searchQuery, options);
    const scMatch = scTracks.find(t => isAccurateMatch(t.title, cleanTitle) && (t.durationMS || 0) > 45000);
    if (scMatch) {
      if (track.thumbnail) scMatch.thumbnail = track.thumbnail;
      logger.info('Bridge', `✓ Matched SoundCloud stream: "${scMatch.title}" for "${track.title}"`);
      return scMatch;
    }
  } catch {}

  // Fallback: return original track
  return track;
}
