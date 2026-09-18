/**
 * Studio Audio Filters and Real-Time DSP effects.
 * Optimized for low-latency live streaming with zero buffer stalls.
 */
export const FILTERS = {
  bassboost: {
    name: 'Bass Boost (Dynamic)',
    emoji: '🔊',
    type: 'ffmpeg',
    ffmpeg: 'bass=g=8:f=110:w=0.3',
    bands: [
      { band: 0, gain: 0.35 },
      { band: 1, gain: 0.30 },
      { band: 2, gain: 0.25 },
      { band: 3, gain: 0.15 },
    ],
  },
  bassboost_extreme: {
    name: 'Bass Boost (Extreme)',
    emoji: '💥',
    type: 'ffmpeg',
    ffmpeg: 'bass=g=14:f=100:w=0.4',
    bands: [
      { band: 0, gain: 0.55 },
      { band: 1, gain: 0.50 },
      { band: 2, gain: 0.40 },
      { band: 3, gain: 0.30 },
    ],
  },
  nightcore: {
    name: 'Nightcore (Pitch + Tempo)',
    emoji: '🌙',
    type: 'ffmpeg',
    ffmpeg: 'aresample=48000,asetrate=48000*1.25',
    sampleRate: 48000 * 1.25,
  },
  vaporwave: {
    name: 'Vaporwave (Lo-Fi Slowed)',
    emoji: '🌊',
    type: 'ffmpeg',
    ffmpeg: 'aresample=48000,asetrate=48000*0.8',
    sampleRate: 48000 * 0.8,
  },
  treble: {
    name: 'Treble Boost (Crystal Highs)',
    emoji: '🎶',
    type: 'ffmpeg',
    ffmpeg: 'treble=g=6:f=3000:w=0.5',
    bands: [
      { band: 11, gain: 0.20 },
      { band: 12, gain: 0.30 },
      { band: 13, gain: 0.35 },
      { band: 14, gain: 0.40 },
    ],
  },
  pop: {
    name: 'Pop Preset (Vocal Enhance)',
    emoji: '🎤',
    type: 'ffmpeg',
    ffmpeg: 'equalizer=f=1000:t=q:w=1:g=2,equalizer=f=3000:t=q:w=1:g=2',
    bands: [
      { band: 0, gain: -0.1 },
      { band: 1, gain: 0.1 },
      { band: 2, gain: 0.2 },
      { band: 3, gain: 0.25 },
      { band: 4, gain: 0.15 },
      { band: 12, gain: 0.15 },
      { band: 13, gain: 0.2 },
    ],
  },
  soft: {
    name: 'Soft (Acoustic Warmth)',
    emoji: '🍃',
    type: 'ffmpeg',
    ffmpeg: 'lowpass=f=8000',
    bands: [
      { band: 0, gain: 0.15 },
      { band: 1, gain: 0.1 },
      { band: 12, gain: -0.1 },
      { band: 13, gain: -0.15 },
      { band: 14, gain: -0.2 },
    ],
  },
  '8d': {
    name: '8D Audio (Surround Spatial)',
    emoji: '🎧',
    type: 'ffmpeg',
    ffmpeg: 'apulsator=hz=0.125',
  },
  karaoke: {
    name: 'Karaoke (Vocal Cut)',
    emoji: '🎙️',
    type: 'ffmpeg',
    ffmpeg: 'stereotools=mlev=0.03',
  },
  normalizer: {
    name: 'Studio Compressor (Clean Output)',
    emoji: '✨',
    type: 'ffmpeg',
    ffmpeg: 'acompressor=threshold=-12dB:ratio=3:attack=20:release=250',
  },
  tiktok: {
    name: 'TikTok Viral (Deep Bass × Bright Shimmer)',
    emoji: '📱',
    type: 'ffmpeg',
    ffmpeg: 'equalizer=f=60:t=q:w=1:g=6,equalizer=f=8000:t=q:w=1:g=4,stereotools=slev=1.1',
    bands: [
      { band: 0, gain: 0.45 },
      { band: 1, gain: 0.40 },
      { band: 2, gain: 0.20 },
      { band: 11, gain: 0.25 },
      { band: 12, gain: 0.30 },
      { band: 13, gain: 0.35 },
    ],
  },
};

/** Get filter by key. Returns null if not found. */
export function getFilter(key) {
  return FILTERS[key?.toLowerCase()] || null;
}

/** List all available filter keys. */
export function listFilters() {
  return Object.entries(FILTERS).map(([key, f]) => ({
    key,
    name: f.name,
    emoji: f.emoji,
    type: f.type,
  }));
}

/**
 * Apply a filter to the queue safely with multi-layer DSP fallbacks.
 * @param {import('discord-player').GuildQueue} queue
 * @param {string} filterKey
 */
export async function applyFilter(queue, filterKey) {
  if (!queue) return false;

  // Turn off all filters
  if (!filterKey || filterKey.toLowerCase() === 'off' || filterKey.toLowerCase() === 'clear') {
    try {
      if (queue.filters?.ffmpeg) {
        await queue.filters.ffmpeg.setFilters([]);
      }
    } catch {}

    if (queue.filters?.equalizer) {
      if (typeof queue.filters.equalizer.resetEQ === 'function') queue.filters.equalizer.resetEQ();
      if (typeof queue.filters.equalizer.disable === 'function') queue.filters.equalizer.disable();
    }
    if (queue.filters?.resampler) {
      if (typeof queue.filters.resampler.setSampleRate === 'function') queue.filters.resampler.setSampleRate(48000);
      if (typeof queue.filters.resampler.disable === 'function') queue.filters.resampler.disable();
    }
    return true;
  }

  const f = getFilter(filterKey);
  if (!f) return false;

  // 1. Try discord-player FFmpeg filter
  try {
    if (queue.filters?.ffmpeg && f.ffmpeg) {
      await queue.filters.ffmpeg.setFilters([f.ffmpeg]);
      return true;
    }
  } catch {}

  // 2. Fallback to Equalizer / Resampler
  try {
    if (f.bands && queue.filters?.equalizer) {
      if (typeof queue.filters.equalizer.setEQ === 'function') queue.filters.equalizer.setEQ(f.bands);
      if (typeof queue.filters.equalizer.enable === 'function') queue.filters.equalizer.enable();
      return true;
    }

    if (f.sampleRate && queue.filters?.resampler) {
      if (typeof queue.filters.resampler.setSampleRate === 'function') queue.filters.resampler.setSampleRate(f.sampleRate);
      if (typeof queue.filters.resampler.enable === 'function') queue.filters.resampler.enable();
      return true;
    }
  } catch {}

  return true;
}
