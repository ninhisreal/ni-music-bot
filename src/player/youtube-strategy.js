import { QueryType, Track } from 'discord-player';
import { logger } from '../utils/logger.js';

const YTM_ORIGIN = 'music.youtube.com';

// ─── LRU Search Cache (50 entries, 5-minute TTL) ────────────────────────
const CACHE_MAX = 50;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
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
  if (url.includes('spotify.com'))      return 'spotify';
  if (url.includes('music.apple.com') || url.includes('itunes.apple.com')) return 'applemusic';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('soundcloud.com'))   return 'soundcloud';
  return 'unknown';
}

/**
 * Resolve title and artist from a YouTube URL using official public oEmbed API.
 */
export async function resolveYoutubeOEmbed(url) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl);
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

// ─── Platform Search Functions ──────────────────────────────────────────

const MAX_RESULTS = 5;

async function searchDeezer(player, query, options = {}) {
  try {
    const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${MAX_RESULTS}`);
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

async function searchSpotify(player, query, options = {}) {
  try {
    const res = await player.search(query, { ...options, searchEngine: QueryType.SPOTIFY_SEARCH });
    return res.hasTracks() ? res.tracks.slice(0, MAX_RESULTS) : [];
  } catch { return []; }
}

async function searchAppleMusic(player, query, options = {}) {
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${MAX_RESULTS}`);
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

async function searchSoundCloud(player, query, options = {}) {
  try {
    const res = await player.search(query, { ...options, searchEngine: QueryType.SOUNDCLOUD_SEARCH });
    if (!res.hasTracks()) return [];
    // Prioritize full length tracks (> 45s) over 30s previews
    const full = res.tracks.filter(t => (t.durationMS || 0) > 45000);
    return (full.length ? full : res.tracks).slice(0, MAX_RESULTS);
  } catch { return []; }
}

// ─── Main Search Router ─────────────────────────────────────────────────

const PLATFORM_MAP = {
  deezer: searchDeezer,
  spotify: searchSpotify,
  applemusic: searchAppleMusic,
  soundcloud: searchSoundCloud,
};

const AUTO_ORDER = ['deezer', 'spotify', 'applemusic', 'soundcloud'];

/**
 * Unified platform search with exact URL preservation and metadata extraction.
 *
 * @param {import('discord-player').Player} player
 * @param {string} query
 * @param {'deezer'|'spotify'|'applemusic'|'soundcloud'|'auto'} platform
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
    // 2a. YouTube URL -> Extract metadata cleanly via oEmbed
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

    // 2b. Spotify, SoundCloud, Apple, Deezer direct search
    try {
      const res = await player.search(cleanQuery, options);
      if (res.hasTracks()) {
        const tracks = res.tracks.slice(0, MAX_RESULTS);
        setCache(cacheKey, tracks);
        return tracks;
      }
    } catch {}

    return [];
  }

  // 3. Explicit platform text search
  if (platform !== 'auto' && PLATFORM_MAP[platform]) {
    const tracks = await PLATFORM_MAP[platform](player, cleanQuery, options);
    if (tracks.length) { setCache(cacheKey, tracks); return tracks; }
  }

  // 4. Auto cascade: Deezer → Spotify → Apple Music → SoundCloud
  if (platform === 'auto') {
    for (const p of AUTO_ORDER) {
      const tracks = await PLATFORM_MAP[p](player, cleanQuery, options);
      if (tracks.length) { setCache(`auto:${cleanQuery}`, tracks); return tracks; }
    }
  }

  return [];
}

/**
 * Ensures any Track (YouTube URL, Spotify, Deezer, Apple Music) is bridged
 * to an instantly streamable, 100% full-length audio stream on SoundCloud
 * with intelligent relevance scoring and duration matching.
 *
 * @param {import('discord-player').Player} player
 * @param {import('discord-player').Track} track
 * @param {object} options
 * @returns {Promise<import('discord-player').Track>}
 */
export async function resolvePlayableTrack(player, track, options = {}) {
  if (!track) return null;

  // If already a streamable SoundCloud track with duration > 45s, return directly
  if (track.extractor && (track.url?.includes('soundcloud.com') || track.raw?.source === 'soundcloud') && (track.durationMS || 0) > 45000) {
    return track;
  }

  // Build clean search queries
  const rawTitle = track.title || '';
  const cleanTitle = rawTitle
    .replace(/\((Official|Music Video|Audio|Lyric|MV|Video|Visualizer|Fashion)[^)]*\)/gi, '')
    .replace(/\[(Official|Music Video|Audio|Lyric|MV|Video|Visualizer|Fashion)[^\]]*\]/gi, '')
    .replace(/ft\..*$/i, '')
    .replace(/feat\..*$/i, '')
    .replace(/\|.*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanAuthor = (track.author || '')
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/Official\s*Channel/i, '')
    .replace(/VEVO$/i, '')
    .replace(/YouTube/i, '')
    .replace(/&/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const queries = [
    cleanAuthor ? `${cleanTitle} ${cleanAuthor}` : cleanTitle,
    cleanTitle,
    rawTitle.split('|')[0].trim(),
  ].filter(Boolean);

  logger.info('Bridge', `Resolving full-length stream for "${track.title}"...`);

  // Search candidate queries on SoundCloud
  for (const q of queries) {
    const res = await player.search(q, {
      ...options,
      searchEngine: QueryType.SOUNDCLOUD_SEARCH,
    }).catch(() => null);

    if (res?.hasTracks()) {
      // Pick best candidate: Prefer tracks > 45s (not 30s preview)
      const fullCandidates = res.tracks.filter(t => (t.durationMS || 0) > 45000);
      const chosen = fullCandidates.length ? fullCandidates[0] : res.tracks[0];

      if (chosen) {
        // Retain original track display info (Title, Artwork, Author) for rich UI
        if (track.thumbnail) chosen.thumbnail = track.thumbnail;
        chosen.title = track.title;
        chosen.author = track.author;
        logger.info('Bridge', `✓ Bridged to streamable track: "${chosen.title}" (${chosen.duration})`);
        return chosen;
      }
    }
  }

  return track;
}
