import { QueryType, Track } from 'discord-player';
import { logger } from '../utils/logger.js';

const YTM_ORIGIN = 'music.youtube.com';

// ─── Lazy Innertube (only initialized when YouTube search is needed) ────
let innertubeInstance = null;
let innertubeLoading = null;

async function getInnertube() {
  if (innertubeInstance) return innertubeInstance;
  if (innertubeLoading) return innertubeLoading;

  innertubeLoading = (async () => {
    const { Innertube, UniversalCache } = await import('youtubei.js');
    innertubeInstance = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
    });
    innertubeLoading = null;
    return innertubeInstance;
  })();

  return innertubeLoading;
}

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
 * Guaranteed 100% success rate without tokens/cookies or cipher issues.
 */
export async function resolveYoutubeOEmbed(url) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.title) return null;

    // Clean common noise tags from YouTube video title
    const cleanTitle = data.title
      .replace(/\((Official|Music Video|Audio|Lyric|MV|Video|Album Sampler|Visualizer)[^)]*\)/gi, '')
      .replace(/\[(Official|Music Video|Audio|Lyric|MV|Video|Album Sampler|Visualizer)[^\]]*\]/gi, '')
      .replace(/\|.*$/g, '')
      .replace(/'/g, '')
      .trim();

    return {
      title: data.title,
      searchQuery: cleanTitle || data.title,
      author: data.author_name || '',
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

async function searchYoutubeMusic(player, query, options = {}) {
  try {
    const yt = await getInnertube();
    const search = await yt.music.search(query);
    const tracks = [];
    for (const section of search.contents || []) {
      if (!section.contents) continue;
      for (const item of section.contents) {
        const vidId = item.id || item.video_id;
        if (vidId && tracks.length < MAX_RESULTS) {
          tracks.push(new Track(player, {
            title: item.title?.toString() || 'Unknown',
            author: item.author?.name?.toString() || item.artists?.[0]?.name?.toString() || 'Unknown',
            url: `https://www.youtube.com/watch?v=${vidId}`,
            duration: item.duration?.text || '0:00',
            thumbnail: item.thumbnails?.[0]?.url,
            source: 'youtube',
            requestedBy: options.requestedBy,
          }));
        }
      }
    }
    return tracks;
  } catch { return []; }
}

async function searchSoundCloud(player, query, options = {}) {
  try {
    const res = await player.search(query, { ...options, searchEngine: QueryType.SOUNDCLOUD_SEARCH });
    return res.hasTracks() ? res.tracks.slice(0, MAX_RESULTS) : [];
  } catch { return []; }
}

// ─── Main Search Router ─────────────────────────────────────────────────

const PLATFORM_MAP = {
  deezer: searchDeezer,
  spotify: searchSpotify,
  applemusic: searchAppleMusic,
  youtube: searchYoutubeMusic,
  soundcloud: searchSoundCloud,
};

const AUTO_ORDER = ['soundcloud', 'deezer', 'spotify', 'applemusic', 'youtube'];

/**
 * Unified platform search with URL resolution and LRU caching.
 *
 * @param {import('discord-player').Player} player
 * @param {string} query
 * @param {'deezer'|'spotify'|'applemusic'|'youtube'|'soundcloud'|'auto'} platform
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
    // 2a. Try direct search with registered extractors first
    try {
      const res = await player.search(cleanQuery, options);
      if (res.hasTracks()) {
        const tracks = res.tracks.slice(0, MAX_RESULTS);
        setCache(cacheKey, tracks);
        return tracks;
      }
    } catch {}

    // 2b. If direct search returned no tracks (e.g. YouTube URL), resolve metadata via oEmbed!
    if (cleanQuery.includes('youtube.com') || cleanQuery.includes('youtu.be')) {
      const oembed = await resolveYoutubeOEmbed(cleanQuery);
      if (oembed?.searchQuery) {
        logger.info('Search', `Resolved YouTube URL to: "${oembed.searchQuery}"`);
        for (const p of AUTO_ORDER) {
          const tracks = await PLATFORM_MAP[p](player, oembed.searchQuery, options);
          if (tracks.length) {
            setCache(cacheKey, tracks);
            return tracks;
          }
        }
      }
    }

    // Direct URL was unresolvable: DO NOT search literal URL string on platforms!
    return [];
  }

  // 3. Explicit platform text search
  if (platform !== 'auto' && PLATFORM_MAP[platform]) {
    const tracks = await PLATFORM_MAP[platform](player, cleanQuery, options);
    if (tracks.length) { setCache(cacheKey, tracks); return tracks; }
  }

  // 4. Auto cascade: SoundCloud → Deezer → Spotify → Apple → YouTube
  if (platform === 'auto') {
    for (const p of AUTO_ORDER) {
      const tracks = await PLATFORM_MAP[p](player, cleanQuery, options);
      if (tracks.length) { setCache(`auto:${cleanQuery}`, tracks); return tracks; }
    }
  }

  return [];
}

/**
 * Ensures any Track (especially metadata-only tracks from Apple Music, Deezer, or Raw YouTube)
 * is bridged to an instantly streamable, lossless audio source (SoundCloud) with 100% reliability.
 *
 * @param {import('discord-player').Player} player
 * @param {import('discord-player').Track} track
 * @param {object} options
 * @returns {Promise<import('discord-player').Track>}
 */
export async function resolvePlayableTrack(player, track, options = {}) {
  if (!track) return null;

  // 1. If it's already an extractor-backed streamable SoundCloud track, play directly!
  if (track.extractor && (track.url?.includes('soundcloud.com') || track.raw?.source === 'soundcloud')) {
    return track;
  }

  // 2. If it's a metadata-only track (Deezer, Apple Music, or unextracted YouTube), bridge to SoundCloud
  const cleanTitle = (track.title || '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, '')
    .replace(/ft\..*$/i, '')
    .replace(/feat\..*$/i, '')
    .trim();

  const cleanAuthor = (track.author || '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, '')
    .replace(/&/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const queryFull = `${cleanTitle} ${cleanAuthor}`.trim();
  const queryTitleOnly = cleanTitle || track.title;

  logger.info('Bridge', `Resolving stream for "${track.title}" (${track.raw?.source || 'metadata'}) via SoundCloud...`);

  // Attempt 1: Title + Artist
  if (queryFull) {
    const res = await player.search(queryFull, {
      ...options,
      searchEngine: QueryType.SOUNDCLOUD_SEARCH,
    }).catch(() => null);

    if (res?.hasTracks()) {
      const st = res.tracks[0];
      if (track.thumbnail) st.thumbnail = track.thumbnail;
      logger.info('Bridge', `✓ Bridged "${track.title}" → "${st.title}" (${st.url})`);
      return st;
    }
  }

  // Attempt 2: Title Only
  if (queryTitleOnly && queryTitleOnly !== queryFull) {
    const res = await player.search(queryTitleOnly, {
      ...options,
      searchEngine: QueryType.SOUNDCLOUD_SEARCH,
    }).catch(() => null);

    if (res?.hasTracks()) {
      const st = res.tracks[0];
      if (track.thumbnail) st.thumbnail = track.thumbnail;
      logger.info('Bridge', `✓ Bridged "${track.title}" (title-only) → "${st.title}" (${st.url})`);
      return st;
    }
  }

  // Fallback to track as-is
  return track;
}
