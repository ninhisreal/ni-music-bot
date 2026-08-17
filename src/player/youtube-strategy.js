import { QueryType, Track } from 'discord-player';
import { logger } from '../utils/logger.js';

const YTM_ORIGIN = 'music.youtube.com';

// ─── Lazy Innertube (YouTube Music Search Engine) ────────────────────────
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

async function searchSpotify(player, query, options = {}) {
  try {
    const res = await player.search(query, { ...options, searchEngine: QueryType.SPOTIFY_SEARCH });
    return res.hasTracks() ? res.tracks.slice(0, MAX_RESULTS) : [];
  } catch { return []; }
}

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
    // Filter out short 30-second snippet previews if full tracks exist
    const full = res.tracks.filter(t => (t.durationMS || 0) > 45000);
    return (full.length ? full : res.tracks).slice(0, MAX_RESULTS);
  } catch { return []; }
}

// ─── Main Search Router ─────────────────────────────────────────────────

const PLATFORM_MAP = {
  youtube: searchYoutubeMusic,
  spotify: searchSpotify,
  deezer: searchDeezer,
  applemusic: searchAppleMusic,
  soundcloud: searchSoundCloud,
};

// Priority: Official Clean Sources First (YouTube Music > Spotify > Deezer > Apple Music > SoundCloud)
const AUTO_ORDER = ['youtube', 'spotify', 'deezer', 'applemusic', 'soundcloud'];

/**
 * Unified platform search with exact URL preservation and LRU caching.
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
    // 2a. YouTube URL -> Preserve exact URL so @distube/ytdl-core streams the full YouTube video
    if (cleanQuery.includes('youtube.com') || cleanQuery.includes('youtu.be')) {
      const oembed = await resolveYoutubeOEmbed(cleanQuery);
      const exactTrack = new Track(player, {
        title: oembed?.title || 'YouTube Track',
        author: oembed?.author || 'YouTube',
        url: cleanQuery,
        thumbnail: oembed?.thumbnail || null,
        source: 'youtube',
        requestedBy: options.requestedBy,
      });
      setCache(cacheKey, [exactTrack]);
      return [exactTrack];
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

  // 4. Auto cascade: YouTube Music → Spotify → Deezer → Apple Music → SoundCloud
  if (platform === 'auto') {
    for (const p of AUTO_ORDER) {
      const tracks = await PLATFORM_MAP[p](player, cleanQuery, options);
      if (tracks.length) { setCache(`auto:${cleanQuery}`, tracks); return tracks; }
    }
  }

  return [];
}

/**
 * Ensures any Track (especially metadata-only tracks from Apple Music, Deezer, etc.)
 * is bridged to an official full-length streamable audio source.
 *
 * @param {import('discord-player').Player} player
 * @param {import('discord-player').Track} track
 * @param {object} options
 * @returns {Promise<import('discord-player').Track>}
 */
export async function resolvePlayableTrack(player, track, options = {}) {
  if (!track) return null;

  // 1. If it's a YouTube URL, let @distube/ytdl-core stream the full video directly!
  if (track.url?.includes('youtube.com') || track.url?.includes('youtu.be') || track.source === 'youtube') {
    return track;
  }

  // 2. If it's already an extractor-backed streamable SoundCloud track (> 45s), play directly
  if (track.extractor && (track.url?.includes('soundcloud.com') || track.raw?.source === 'soundcloud') && (track.durationMS || 0) > 45000) {
    return track;
  }

  // 3. For metadata-only tracks (Apple Music, Deezer), bridge to official full-length YouTube Music!
  const cleanTitle = (track.title || '')
    .replace(/\((Official|Music Video|Audio|Lyric|MV|Video|Visualizer)[^)]*\)/gi, '')
    .replace(/\[(Official|Music Video|Audio|Lyric|MV|Video|Visualizer)[^\]]*\]/gi, '')
    .replace(/ft\..*$/i, '')
    .replace(/feat\..*$/i, '')
    .trim();

  const cleanAuthor = (track.author || '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, '')
    .replace(/&/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const searchQuery = `${cleanTitle} ${cleanAuthor}`.trim();

  logger.info('Bridge', `Bridging "${track.title}" to full-length YouTube Music stream...`);

  // Search YouTube Music for full song
  const ytTracks = await searchYoutubeMusic(player, searchQuery, options);
  if (ytTracks?.length) {
    const streamTrack = ytTracks[0];
    if (track.thumbnail) streamTrack.thumbnail = track.thumbnail;
    logger.info('Bridge', `✓ Bridged to YouTube Music: "${streamTrack.title}" (${streamTrack.url})`);
    return streamTrack;
  }

  // Fallback to SoundCloud (only full tracks > 45s)
  const scRes = await player.search(searchQuery, {
    ...options,
    searchEngine: QueryType.SOUNDCLOUD_SEARCH,
  }).catch(() => null);

  if (scRes?.hasTracks()) {
    const fullSc = scRes.tracks.find(t => (t.durationMS || 0) > 45000) || scRes.tracks[0];
    if (track.thumbnail) fullSc.thumbnail = track.thumbnail;
    return fullSc;
  }

  return track;
}
